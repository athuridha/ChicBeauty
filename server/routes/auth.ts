import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'

const router = Router()

router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) {
    res.status(400).json({ error: 'Email & password wajib' })
    return
  }
  const artist = await prisma.artist.findUnique({ where: { email } })
  if (!artist || !artist.password_hash) {
    res.status(401).json({ error: 'Email atau password salah' })
    return
  }
  const ok = await bcrypt.compare(password, artist.password_hash)
  if (!ok) {
    res.status(401).json({ error: 'Email atau password salah' })
    return
  }
  const user = { id: artist.id, role: artist.role, name: artist.name }
  ;(req.session as any).user = user
  res.json({ user })
})

router.post('/logout', (req, res) => {
  req.session = null as any
  res.json({ ok: true })
})

router.get('/me', (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  res.json(req.user)
})

export default router
