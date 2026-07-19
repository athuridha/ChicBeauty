import cookieParser from 'cookie-parser'
import cookieSession from 'cookie-session'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { ensureUploadDir } from './lib/upload'
import { sendEmail } from './lib/email'
import bookingRoutes from './routes/booking'
import artistRoutes from './routes/artist'
import adminRoutes from './routes/admin'
import authRoutes from './routes/auth'
import clientRoutes from './routes/client'
import photoRoutes from './routes/photo'
import serviceRoutes from './routes/service'
import multer from 'multer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = Number(process.env.PORT ?? 3000)

app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Real session middleware (cookie-session, signed with SESSION_SECRET)
app.use(
  cookieSession({
    name: 'amar_session',
    keys: [process.env.SESSION_SECRET ?? 'amar-dev-secret-change-me'],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax',
  }),
)

// Populate req.user from session
app.use((req, _res, next) => {
  if ((req.session as any)?.user) {
    ;(req as any).user = (req.session as any).user
  } else {
    ;(req as any).user = null
  }
  next()
})

// Static uploads (foto before/after + bukti deposit)
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')))

app.use('/api/booking', bookingRoutes)
app.use('/api/artists', artistRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/clients', clientRoutes)
app.use('/api', photoRoutes)
app.use('/api/services', serviceRoutes)

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Global Error Handler (Express middleware)
app.use((err: any, _req: any, res: any, _next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'Ukuran file terlalu besar. Maksimal adalah 5 MB.' })
      return
    }
    res.status(400).json({ error: `Gagal upload file: ${err.message}` })
    return
  }

  if (err.message === 'Hanya JPG/PNG') {
    res.status(400).json({ error: 'Format file tidak didukung. Hanya diperbolehkan JPG/PNG.' })
    return
  }

  console.error('[server error]', err)
  res.status(500).json({ error: 'Terjadi kesalahan internal server.' })
})

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  const dist = path.resolve(__dirname, '../dist')
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

async function autoCancelExpiredDeposits() {
  const prisma = new PrismaClient()
  try {
    // PRD: booking otomatis dibatalkan kalau deposit belum dibayar dalam 2 jam.
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const expired = await prisma.booking.findMany({
      where: {
        status: 'pending_deposit',
        created_at: { lt: cutoff },
      },
      include: { client: true },
    })
    for (const b of expired) {
      await prisma.booking.update({
        where: { id: b.id },
        data: { status: 'cancelled' },
      })
      await sendEmail(
        b.client?.email ?? '',
        'Booking Dibatalkan — Deposit Tidak Diterima',
        `Booking ID #${b.id} dibatalkan otomatis karena deposit tidak diterima dalam 2 jam.`,
      ).catch(() => {})
      console.log(`[auto-cancel] booking #${b.id} cancelled`)
    }
  } catch (e) {
    console.error('[auto-cancel] error', e)
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  await ensureUploadDir()
  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`)
  })
  // Run auto-cancel every 5 minutes
  setInterval(autoCancelExpiredDeposits, 5 * 60 * 1000)
  autoCancelExpiredDeposits()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
