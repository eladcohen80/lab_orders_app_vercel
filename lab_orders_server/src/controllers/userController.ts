import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
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
           //(req as any) is used to access the user property of the request object
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

