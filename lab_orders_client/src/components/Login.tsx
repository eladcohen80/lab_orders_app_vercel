import { useState } from 'react'
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

      localStorage.setItem( 'token', data.token)

      localStorage.setItem( 'user', JSON.stringify(data.user))

      alert('Login successful')

      navigate('/')

    } catch (error) {

      console.error(error)

      setMessage('Server error')
    }
  }

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
