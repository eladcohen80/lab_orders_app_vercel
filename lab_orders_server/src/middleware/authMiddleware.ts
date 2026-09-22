import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'


export interface AuthRequest extends Request {
    user?: {
      user_id: number
      email: string
      role: string
    }
  }
  
export function authMiddleware(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    const authorization = req.headers.authorization
  
    if (!authorization) {
      return res.status(401).json({
        error: 'Token is missing'
      })
    }
  
    const token = authorization.split(' ')[1]//['Bearer', 'token']
  
    if (!token) {
      return res.status(401).json({
        error: 'Token is missing'
      })
    }
  
    const secret = process.env.JWT_SECRET || 'my_super_secret_jwt_key_12345'
  
    try {
      const decoded = jwt.verify(token, secret) as {
        user_id: number
        email: string
        role: string
      }
  
      (req as any).user = decoded
  
      next()
  
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid token'
      })
    }
  }