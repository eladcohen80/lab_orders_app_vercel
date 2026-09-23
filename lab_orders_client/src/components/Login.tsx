import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import './Auth.css'
import { BASE_URL } from '../services/apiConfig'

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 שעה במילישניות

 async function handleSubmit(e: FormEvent<HTMLFormElement>) {

    e.preventDefault()

    try {

      const response = await fetch(`${BASE_URL}/users/login`, {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            email: email,
            password: password
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {

        setMessage(
          data.error || 'Login failed'
        )

        return
      }

            // שמירת הטוקן עם זמן expiration
      const expirationTime = new Date().getTime() + SESSION_TIMEOUT
      localStorage.setItem('token', data.token)
      localStorage.setItem('tokenExpiration', expirationTime.toString())

      localStorage.setItem( 'user', JSON.stringify(data.user))

      // הגדרת timeout להתנתקות אוטומטית
      const timeoutId = setTimeout(() => {
        handleLogout()
      }, SESSION_TIMEOUT)

      // שמירת timeout ID לביטול בזמן התנתקות
      localStorage.setItem('logoutTimeoutId', timeoutId.toString())

      alert('Login successful')

      navigate('/')

    } catch (error) {

      console.error(error)

      setMessage('Server error')
    }
    }

  // פונקציה לביצוע logout
  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('tokenExpiration')
    localStorage.removeItem('user')
    localStorage.removeItem('logoutTimeoutId')
    setMessage('Session expired. Please log in again.')
    navigate('/login')
  }

  // בדיקת expiration של הטוקן בעת טעינת הקומפוננטה
  useEffect(() => {
    const checkSessionValidity = () => {
      const tokenExpiration = localStorage.getItem('tokenExpiration')
      if (tokenExpiration) {
        const expirationTime = parseInt(tokenExpiration)
        const currentTime = new Date().getTime()
        
        if (currentTime > expirationTime) {
          // הטוקן פג התוקף
          handleLogout()
        }
      }
    }

    // בדיקה בעת טעינת הדף
    checkSessionValidity()

    // בדיקה כל 5 דקות
    const interval = setInterval(checkSessionValidity, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Login</h2>
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email" required />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                      <div className="password-field">
                        <input type={isPasswordVisible ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required />
                        <button type="button" className="password-toggle" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setIsPasswordVisible(true); }} onPointerUp={() => setIsPasswordVisible(false)} onPointerLeave={() => setIsPasswordVisible(false)} onPointerCancel={() => setIsPasswordVisible(false)} aria-label="Hold to show password" title="Hold to show password">
                          &#128065;
                        </button>
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary">Login</button>
                    {message && <p className="error-message">{message}</p>}
                </form>
            </div>
        </div>
    )
}
