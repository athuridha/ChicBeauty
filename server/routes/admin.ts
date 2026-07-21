import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAdmin, requireAuth } from '../middleware/auth'
import bcrypt from 'bcryptjs'
const router = Router()

const rulesSchema = z.object({
  deposit_percentage: z.number().int().min(0).max(100).optional(),
  cancel_threshold_hours: z.number().int().min(0).optional(),
  penalty_percentage: z.number().int().min(0).max(100).optional(),
  buffer_minutes: z.number().int().min(0).optional(),
})

router.get('/rules', async (_req, res) => {
  const rules = await prisma.businessRule.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  })
  res.json(rules)
})

router.put('/rules', requireAdmin, async (req, res) => {
  const parsed = rulesSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }
  const updated = await prisma.businessRule.upsert({
    where: { id: 1 },
    create: { id: 1, ...parsed.data },
    update: parsed.data,
  })
  res.json(updated)
})

router.get('/stats', requireAdmin, async (_req, res) => {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const [bookings_today, pending_deposits, cancelled, total] = await Promise.all([
    prisma.booking.count({
      where: { scheduled_at: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.booking.count({ where: { status: 'pending_deposit' } }),
    prisma.booking.count({
      where: { status: { startsWith: 'cancelled' } },
    }),
    prisma.booking.count(),
  ])

  const topArtists = await prisma.booking.groupBy({
    by: ['artist_id'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 1,
  })
  let top_artist = null
  if (topArtists[0]) {
    const a = await prisma.artist.findUnique({
      where: { id: topArtists[0].artist_id },
    })
    if (a) top_artist = { name: a.name, bookings: topArtists[0]._count.id }
  }

  res.json({
    bookings_today,
    pending_deposits,
    cancel_rate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
    top_artist,
  })
})

// Booking list with filters (admin dashboard table)
router.get('/bookings', requireAuth, async (req, res) => {
  const status = (req.query.status as string | undefined) ?? null
  const from = req.query.from as string | undefined
  const to = req.query.to as string | undefined

  const where: any = {}
  if (status && status !== 'all') where.status = status
  if (from || to) {
    where.scheduled_at = {}
    if (from) where.scheduled_at.gte = new Date(`${from}T00:00:00`)
    if (to) where.scheduled_at.lte = new Date(`${to}T23:59:59`)
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: { client: true, artist: true },
    orderBy: { scheduled_at: 'desc' },
    take: 200,
  })
  res.json(bookings)
})

// CSV export (PRD Section 9 — Should Have)
router.get('/bookings/export.csv', requireAdmin, async (_req, res) => {
  const bookings = await prisma.booking.findMany({
    include: { client: true, artist: true },
    orderBy: { scheduled_at: 'desc' },
  })
  const headers = [
    'id',
    'client_name',
    'client_email',
    'client_phone',
    'artist_name',
    'scheduled_at',
    'service_package',
    'status',
    'deposit_paid',
    'penalty_applied',
    'created_at',
  ]
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = bookings.map((b) =>
    [
      b.id,
      b.client?.full_name ?? '',
      b.client?.email ?? '',
      b.client?.phone ?? '',
      b.artist?.name ?? '',
      b.scheduled_at.toISOString(),
      b.service_package,
      b.status,
      b.deposit_paid?.toString() ?? '',
      b.penalty_applied?.toString() ?? '',
      b.created_at.toISOString(),
    ]
      .map(escape)
      .join(','),
  )
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="bookings-${new Date().toISOString().slice(0, 10)}.csv"`,
  )
  res.send([headers.join(','), ...rows].join('\n'))
})

// Artist management (admin)
router.get('/artists', requireAdmin, async (_req, res) => {
  const artists = await prisma.artist.findMany({
    where: { role: 'artist' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      start_time: true,
      end_time: true,
      is_active: true,
      role: true,
      created_at: true,
    },
  })
  res.json(artists)
})

const artistSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  password: z.string().min(6).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  is_active: z.boolean().optional(),
})

router.post('/artists', requireAdmin, async (req, res) => {
  const parsed = artistSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }
  const { name, email, phone, password, start_time, end_time, is_active } =
    parsed.data

  const password_hash = await bcrypt.hash(password ?? 'artist123', 10)
  const artist = await prisma.artist.create({
    data: {
      name,
      email,
      phone,
      password_hash,
      start_time,
      end_time,
      is_active: is_active ?? true,
      role: 'artist',
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      start_time: true,
      end_time: true,
      is_active: true,
      role: true,
      created_at: true,
    },
  })
  res.status(201).json(artist)
})

router.patch('/artists/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const parsed = artistSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }
  const data: any = { ...parsed.data }
  if (parsed.data.password) {
  
    data.password_hash = await bcrypt.hash(parsed.data.password, 10)
    delete data.password
  }
  const updated = await prisma.artist.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      start_time: true,
      end_time: true,
      is_active: true,
      role: true,
      created_at: true,
    },
  })
  res.json(updated)
})

router.delete('/artists/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  try {
    const artist = await prisma.artist.findUnique({ where: { id } })
    if (!artist) {
      res.status(404).json({ error: 'Artist tidak ditemukan' })
      return
    }

    // Check if artist has bookings
    const bookingsCount = await prisma.booking.count({
      where: { artist_id: id },
    })

    if (bookingsCount > 0) {
      res.status(400).json({
        error: 'Artist tidak bisa dihapus karena memiliki riwayat booking. Silakan nonaktifkan artist jika sudah tidak bertugas.',
      })
      return
    }

    await prisma.artist.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus artist' })
  }
})

// Quick client search (PRD Section 9 — Should Have)
router.get('/clients/search', requireAuth, async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim()
  if (!q || q.length < 2) {
    res.json([])
    return
  }
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { full_name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ],
    },
    take: 20,
    orderBy: { created_at: 'desc' },
    include: { _count: { select: { bookings: true } } },
  })
  res.json(clients)
})

// Full client list with booking counts (admin clients page)
router.get('/clients', requireAdmin, async (_req, res) => {
  const clients = await prisma.client.findMany({
    orderBy: { created_at: 'desc' },
    include: { _count: { select: { bookings: true } } },
  })
  res.json(clients)
})

// ─── Admin booking actions ───

// Manually confirm deposit (no file upload) — pending_deposit/confirmed → confirmed
router.post('/bookings/:id/confirm-deposit', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) {
    res.status(404).json({ error: 'Booking tidak ditemukan' })
    return
  }
  if (booking.status !== 'pending_deposit' && booking.status !== 'confirmed') {
    res.status(409).json({
      error: `Booking berstatus ${booking.status}, tidak bisa konfirmasi deposit`,
    })
    return
  }
  const rules = await prisma.businessRule.findUnique({ where: { id: 1 } })
  const pct = rules?.deposit_percentage ?? 50
  const pkg = await prisma.servicePackage.findFirst({ where: { name: booking.service_package } })
  const price = pkg?.price ?? 0
  const depositAmount = (price * pct) / 100

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: 'confirmed', deposit_paid: depositAmount },
    include: { client: true, artist: true },
  })
  res.json(updated)
})

// Admin cancel — applies penalty per business rules when past threshold
router.post('/bookings/:id/cancel', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) {
    res.status(404).json({ error: 'Booking tidak ditemukan' })
    return
  }
  if (booking.status.startsWith('cancelled') || booking.status === 'completed') {
    res.status(409).json({
      error: `Booking berstatus ${booking.status}, tidak bisa dibatalkan`,
    })
    return
  }
  const rules = await prisma.businessRule.findUnique({ where: { id: 1 } })
  const thresholdHours = rules?.cancel_threshold_hours ?? 24
  const penaltyPct = rules?.penalty_percentage ?? 100

  const hoursUntil =
    (booking.scheduled_at.getTime() - Date.now()) / 3600000
  const applyPenalty = hoursUntil < thresholdHours
  const penalty = applyPenalty
    ? Number(booking.deposit_paid ?? 0) * (penaltyPct / 100)
    : null

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: applyPenalty ? 'cancelled_penalty_applied' : 'cancelled',
      penalty_applied: penalty,
    },
    include: { client: true, artist: true },
  })
  res.json(updated)
})

export default router
