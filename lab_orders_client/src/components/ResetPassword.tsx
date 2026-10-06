import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import './Auth.css'
import { BASE_URL } from '../services/apiConfig'

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')

    if (!token) {
      setMessage('Invalid or missing reset token.')
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${BASE_URL}/users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.error || 'Failed to reset password.')
        return
      }

      setIsSuccess(true)
      setMessage('Your password has been reset successfully!')
      setTimeout(() => navigate('/login'), 3000)
    } catch (error) {
      console.error(error)
      setMessage('Server error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Reset Password</h2>
        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p className="success-message">{message}</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-h)', marginTop: '0.5rem' }}>
              Redirecting to login...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>New Password</label>
              <div className="password-field">
                <input
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setIsPasswordVisible(true) }}
                  onPointerUp={() => setIsPasswordVisible(false)}
                  onPointerLeave={() => setIsPasswordVisible(false)}
                  onPointerCancel={() => setIsPasswordVisible(false)}
                  aria-label="Hold to show password"
                  title="Hold to show password"
                >
                  &#128065;
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type={isPasswordVisible ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={6}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>

            {message && !isSuccess && <p className="error-message">{message}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
