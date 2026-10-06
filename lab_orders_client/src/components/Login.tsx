import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import './Auth.css'
import { BASE_URL } from '../services/apiConfig'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [message, setMessage] = useState('')

  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotIsSuccess, setForgotIsSuccess] = useState(false)
  const [forgotIsLoading, setForgotIsLoading] = useState(false)

  const navigate = useNavigate()
  const SESSION_TIMEOUT = 60 * 60 * 1000

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    try {
      const response = await fetch(`${BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.error || 'Login failed')
        return
      }

      const expirationTime = new Date().getTime() + SESSION_TIMEOUT
      localStorage.setItem('token', data.token)
      localStorage.setItem('tokenExpiration', expirationTime.toString())
      localStorage.setItem('user', JSON.stringify(data.user))

      const timeoutId = setTimeout(() => {
        handleLogout()
      }, SESSION_TIMEOUT)

      localStorage.setItem('logoutTimeoutId', timeoutId.toString())

      alert('Login successful')
      navigate('/')
    } catch (error) {
      console.error(error)
      setMessage('Server error')
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('tokenExpiration')
    localStorage.removeItem('user')
    localStorage.removeItem('logoutTimeoutId')
    setMessage('Session expired. Please log in again.')
    navigate('/login')
  }

  useEffect(() => {
    const checkSessionValidity = () => {
      const tokenExpiration = localStorage.getItem('tokenExpiration')
      if (tokenExpiration) {
        const expirationTime = parseInt(tokenExpiration)
        const currentTime = new Date().getTime()
        if (currentTime > expirationTime) {
          handleLogout()
        }
      }
    }

    checkSessionValidity()
    const interval = setInterval(checkSessionValidity, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function handleForgotPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setForgotMessage('')
    setForgotIsSuccess(false)
    setForgotIsLoading(true)

    try {
      const response = await fetch(`${BASE_URL}/users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        setForgotMessage(data.error || 'Something went wrong.')
        return
      }

      setForgotIsSuccess(true)
      setForgotMessage('If this email exists, a reset link has been sent. Please check your inbox.')
    } catch (error) {
      console.error(error)
      setForgotMessage('Server error. Please try again.')
    } finally {
      setForgotIsLoading(false)
    }
  }

  function closeForgotModal() {
    setShowForgotModal(false)
    setForgotEmail('')
    setForgotMessage('')
    setForgotIsSuccess(false)
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="password-field">
              <input
                type={isPasswordVisible ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setIsPasswordVisible(true) }}
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

          <button
            type="button"
            className="forgot-password-link"
            onClick={() => setShowForgotModal(true)}
          >
            Forgot password?
          </button>

          <button type="submit" className="btn btn-primary">Login</button>
          {message && <p className="error-message">{message}</p>}
        </form>
      </div>

      {showForgotModal && (
        <div className="modal-overlay" onClick={closeForgotModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeForgotModal} aria-label="Close">&#x2715;</button>
            <h3>Forgot Password</h3>

            {forgotIsSuccess ? (
              <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                <p className="success-message">{forgotMessage}</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginTop: '1rem', width: '100%' }}
                  onClick={closeForgotModal}
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="auth-form">
                <p className="modal-description">
                  Enter your email address and we will send you a link to reset your password.
                </p>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={forgotIsLoading}>
                  {forgotIsLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
                {forgotMessage && !forgotIsSuccess && (
                  <p className="error-message">{forgotMessage}</p>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
