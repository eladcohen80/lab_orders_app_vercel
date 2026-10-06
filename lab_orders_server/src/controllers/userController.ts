import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

async function sendBrevoEmail(opts: { to: string; toName?: string; subject: string; html: string }) {
    const apiKey = process.env.BREVO_API_KEY
    const fromEmail = process.env.BREVO_FROM_EMAIL
    if (!apiKey || !fromEmail) {
        throw new Error('BREVO_API_KEY and BREVO_FROM_EMAIL must be set')
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'api-key': apiKey,
        },
        body: JSON.stringify({
            sender: { email: fromEmail, name: process.env.BREVO_FROM_NAME || 'Lab Orders' },
            to: [{ email: opts.to, name: opts.toName }],
            subject: opts.subject,
            htmlContent: opts.html,
        }),
    })

    if (!response.ok) {
        throw new Error(`Brevo error ${response.status}: ${await response.text()}`)
    }
}
import sql from '../db'
import { AuthRequest } from '../middleware/authMiddleware'

export async function register(req: Request, res: Response) {
    try {
        const { user_name, email, password } = req.body

        if (!user_name || !email || !password) {
            return res.status(400).json({
                error: 'All fields are required'
            })
        }

        const existingUsers = await sql`
        SELECT *
        FROM users
        WHERE email = ${email}
      `

        if (existingUsers.length > 0) {
            return res.status(400).json({
                error: 'Email already exists'
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const users = await sql`
        INSERT INTO users (
          user_name,
          email,
          password
        )
        VALUES (
          ${user_name},
          ${email},
          ${hashedPassword}
        )
        RETURNING user_id, user_name, email, role
      `

        res.status(201).json(users[0])

    } catch (error) {
        console.error(error)

        res.status(500).json({
            error: 'Failed to register'
        })
    }
}


export async function login(req: Request, res: Response) {
    try {
        console.log((req as any).user)
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            })
        }

        const users = await sql`
        SELECT *
        FROM users
        WHERE email = ${email}
      `

        if (users.length === 0) {
            return res.status(401).json({
                error: 'Invalid email or password'
            })
        }

        const user = users[0]

        if (!user || !user.password) {
            return res.status(401).json({
                error: 'Invalid email or password'
            })
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        )

        if (!passwordMatch) {
            return res.status(401).json({
                error: 'Invalid email or password'
            })
        }

        const secret = process.env.JWT_SECRET || 'my_super_secret_jwt_key_12345'

        const token = jwt.sign(
            {
                user_id: user.user_id,
                email: user.email,
                role: user.role
            },
            secret,
            {
                expiresIn: '1h'
            }
        )

        res.json({
            token,
            user: {
                user_id: user.user_id,
                user_name: user.user_name,
                email: user.email,
                role: user.role
            }
        })

    } catch (error) {
        console.error('Login error:', error)

        res.status(500).json({
            error: 'Failed to login'
        })
    }
}


export async function forgotPassword(req: Request, res: Response) {
    try {
        const { email } = req.body

        if (!email) {
            return res.status(400).json({ error: 'Email is required' })
        }

        const users = await sql`
            SELECT user_id, email, user_name FROM users WHERE email = ${email}
        `

        // Always return success to not expose whether the email exists
        if (users.length === 0) {
            return res.json({ message: 'If this email exists, a reset link has been sent.' })
        }

        const user = users[0]

        // Generate a secure random reset token
        const resetToken = crypto.randomBytes(32).toString('hex')
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

        // Save the token to DB
        await sql`
            UPDATE users
            SET reset_token = ${resetToken},
                reset_token_expiry = ${resetTokenExpiry}
            WHERE user_id = ${user.user_id}
        `

        // Build the reset link
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
        const resetLink = `${clientUrl}/reset-password?token=${resetToken}`

        await sendBrevoEmail({
            to: user.email,
            toName: user.user_name,
            subject: 'Password Reset Request',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
                    <h2 style="color: #2b6cb0;">Password Reset</h2>
                    <p>Hello ${user.user_name},</p>
                    <p>We received a request to reset your password. Click the button below to set a new password:</p>
                    <a href="${resetLink}" style="display:inline-block; margin: 1rem 0; padding: 0.75rem 1.5rem; background-color: #2b6cb0; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
                    <p style="color: #666; font-size: 0.9rem;">This link will expire in 1 hour.</p>
                    <p style="color: #666; font-size: 0.9rem;">If you did not request this, you can ignore this email.</p>
                </div>
            `,
        })

        res.json({ message: 'If this email exists, a reset link has been sent.' })

    } catch (error) {
        console.error('Forgot password error:', error)
        res.status(500).json({ error: 'Failed to send reset email' })
    }
}


export async function resetPassword(req: Request, res: Response) {
    try {
        const { token, newPassword } = req.body

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' })
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' })
        }

        // Find user by token and check expiry
        const users = await sql`
            SELECT user_id FROM users
            WHERE reset_token = ${token}
            AND reset_token_expiry > NOW()
        `

        if (users.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired reset token' })
        }

        const user = users[0]
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // Update password and clear the reset token
        await sql`
            UPDATE users
            SET password = ${hashedPassword},
                reset_token = NULL,
                reset_token_expiry = NULL
            WHERE user_id = ${user.user_id}
        `

        res.json({ message: 'Password has been reset successfully' })

    } catch (error) {
        console.error('Reset password error:', error)
        res.status(500).json({ error: 'Failed to reset password' })
    }
}
