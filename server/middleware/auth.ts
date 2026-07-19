import type { Request, Response, NextFunction } from 'express'

export interface SessionUser {
  id: number
  role: 'admin' | 'artist'
  name: string
}

declare global {
  namespace Express {
    interface User {
      id: number
      role: 'admin' | 'artist'
      name: string
    }
    interface Request {
      user?: User | null
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' })
    return
  }
  next()
}
