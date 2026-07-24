import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { sendEmail } from '../lib/email'
import { upload } from '../lib/upload'
import {
  sendBookingCreatedWA,
  sendDepositConfirmedWA,
  sendBookingCheckedInWA,
  sendBookingCompletedWA,
  sendBookingRescheduledWA,
  sendBookingCancelledWA,
} from '../lib/fonnte'

const router = Router()

const SERVICE_PACKAGES = [
  { id: 'classic', name: 'Classic Lash', duration_minutes: 60, price: 250000 },
  { id: 'volume', name: 'Volume Lash', duration_minutes: 90, price: 400000 },
  { id: 'mega-volume', name: 'Mega Volume', duration_minutes: 120, price: 550000 },
]

function pkgDuration(name: string): number {
  if (/mega/i.test(name)) return 120
  if (/volume/i.test(name)) return 90
  return 60
}

const createSchema = z.object({
  client: z.object({
    full_name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(6),
  }),
  artist_id: z.number().int().optional(),
  scheduled_at: z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Invalid datetime format' }),
  service_package: z.string().min(1),
  location_type: z.enum(['studio', 'home_service']),
  address: z.string().optional(),
  payment_type: z.enum(['deposit', 'pay_after_service']).optional(),
})

router.post('/create', async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }
  const { client, artist_id, scheduled_at, service_package, location_type, address, payment_type } = parsed.data

  let targetArtistId = artist_id
  if (!targetArtistId) {
    const defaultArtist = await prisma.artist.findFirst({ where: { is_active: true } }) ?? await prisma.artist.findFirst()
    if (!defaultArtist) {
      res.status(400).json({ error: 'Belum ada artist yang tersedia' })
      return
    }
    targetArtistId = defaultArtist.id
  }

  const artist = await prisma.artist.findUnique({ where: { id: targetArtistId } })
  if (!artist || !artist.is_active) {
    res.status(404).json({ error: 'Artist tidak ditemukan atau tidak aktif' })
    return
  }

  const rules = await prisma.businessRule.findUnique({ where: { id: 1 } })
  if (location_type === 'studio' && (rules?.allow_studio === false || artist.allows_studio === false)) {
    res.status(400).json({ error: 'Layanan Di Studio saat ini tidak tersedia untuk artist ini' })
    return
  }
  if (location_type === 'home_service' && (rules?.allow_home_service === false || artist.allows_home_service === false)) {
    res.status(400).json({ error: 'Layanan Home Service saat ini tidak tersedia untuk artist ini' })
    return
  }
  const bufferMin = rules?.buffer_minutes ?? 30
  const start = new Date(scheduled_at)
  const duration = pkgDuration(service_package)
  const end = new Date(start.getTime() + duration * 60 * 1000)
  const conflicting = await prisma.booking.findFirst({
    where: {
      artist_id: targetArtistId,
      status: { in: ['pending_deposit', 'confirmed', 'checked_in'] },
      AND: [
        { scheduled_at: { lt: new Date(end.getTime() + bufferMin * 60000) } },
        { scheduled_at: { gt: new Date(start.getTime() - bufferMin * 60000) } },
      ],
    },
  })
  if (conflicting) {
    res.status(409).json({ error: 'Slot bentrok dengan booking lain' })
    return
  }

  // Determine effective payment type
  let effectivePaymentType: 'deposit' | 'pay_after_service' = 'deposit'
  if (rules?.payment_mode === 'pay_after_service') {
    effectivePaymentType = 'pay_after_service'
  } else if (rules?.payment_mode === 'flexible') {
    effectivePaymentType = payment_type || 'deposit'
  } else {
    effectivePaymentType = 'deposit'
  }

  const initialStatus = effectivePaymentType === 'pay_after_service' ? 'confirmed' : 'pending_deposit'

  // Upsert client by email
  const clientRow = await prisma.client.upsert({
    where: { email: client.email },
    create: {
      full_name: client.full_name,
      email: client.email,
      phone: client.phone,
    },
    update: { full_name: client.full_name, phone: client.phone },
  })

  const booking = await prisma.booking.create({
    data: {
      client_id: clientRow.id,
      artist_id: targetArtistId,
      scheduled_at: start,
      service_package,
      location_type,
      address,
      status: initialStatus,
      payment_type: effectivePaymentType,
      deposit_paid: effectivePaymentType === 'pay_after_service' ? 0 : null,
    },
    include: {
      artist: true,
      client: true,
    },
  })

  const emailMsg = effectivePaymentType === 'pay_after_service'
    ? `Booking ID #${booking.id}. Status: confirmed. Pembayaran penuh dilakukan langsung ke artist setelah selesai treatment.`
    : `Booking ID #${booking.id}. Status: pending_deposit. Upload bukti deposit dalam 2 jam.`

  await sendEmail(
    client.email,
    'Konfirmasi Booking — Amar Klinik',
    emailMsg,
  ).catch(() => {})

  sendBookingCreatedWA({
    phone: client.phone,
    clientName: client.full_name,
    bookingId: booking.id,
    serviceName: booking.service_package,
    scheduledAt: booking.scheduled_at,
    locationType: booking.location_type,
    address: booking.address,
    artistName: booking.artist?.name,
    artistPhone: booking.artist?.phone,
  }).catch(() => {})

  res.status(201).json(booking)
})

router.post('/:id/deposit-upload', upload.single('file'), async (req, res) => {
  const id = Number(req.params.id)
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { client: true, artist: true },
  })
  if (!booking) {
    res.status(404).json({ error: 'Booking tidak ditemukan' })
    return
  }
  if (booking.status !== 'pending_deposit' && booking.status !== 'confirmed') {
    res.status(409).json({ error: `Booking berstatus ${booking.status}, tidak bisa upload deposit` })
    return
  }

  // Mark deposit paid using rules percentage of package price
  const rules = await prisma.businessRule.findUnique({ where: { id: 1 } })
  const pct = rules?.deposit_percentage ?? 50
  const pkg = await prisma.servicePackage.findFirst({ where: { name: booking.service_package } })
  const price = pkg?.price ?? 0
  const depositAmount = (price * pct) / 100

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: 'confirmed',
      deposit_paid: depositAmount,
    },
    include: { client: true, artist: true },
  })
  await sendEmail(
    booking.client?.email ?? '',
    'Deposit Diterima — Amar Klinik',
    `Booking ID #${id} terkonfirmasi. Deposit: Rp${depositAmount.toLocaleString('id-ID')}.`,
  ).catch(() => {})

  sendDepositConfirmedWA({
    phone: updated.client?.phone ?? '',
    clientName: updated.client?.full_name ?? '',
    bookingId: updated.id,
    serviceName: updated.service_package,
    depositAmount: Number(updated.deposit_paid ?? 0),
    scheduledAt: updated.scheduled_at,
    artistName: updated.artist?.name,
    artistPhone: updated.artist?.phone,
  }).catch(() => {})

  res.json(updated)
})

router.post('/:id/cancel', async (req, res) => {
  const id = Number(req.params.id)
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { client: true, artist: true },
  })
  if (!booking) {
    res.status(404).json({ error: 'Booking tidak ditemukan' })
    return
  }
  const rules = await prisma.businessRule.findUnique({ where: { id: 1 } })
  const thresholdHours = rules?.cancel_threshold_hours ?? 24
  const penaltyPct = rules?.penalty_percentage ?? 100

  const now = new Date()
  const hoursUntil = (booking.scheduled_at.getTime() - now.getTime()) / 3600000
  const applyPenalty = hoursUntil < thresholdHours
  const penalty = applyPenalty
    ? Number(booking.deposit_paid ?? 0) * (penaltyPct / 100)
    : null

  await prisma.booking.update({
    where: { id },
    data: {
      status: applyPenalty ? 'cancelled_penalty_applied' : 'cancelled',
      penalty_applied: penalty,
    },
  })

  sendBookingCancelledWA({
    phone: booking.client?.phone ?? '',
    clientName: booking.client?.full_name ?? '',
    bookingId: booking.id,
    reason: applyPenalty ? 'Pembatalan melewati batas waktu toleransi' : 'Dibatalkan oleh Klien',
    artistName: booking.artist?.name,
    artistPhone: booking.artist?.phone,
  }).catch(() => {})

  res.json({ ok: true, penalty_applied: penalty })
})

router.get('/', async (req, res) => {
  const artist_id = Number(req.query.artist_id)
  const from = req.query.from as string | undefined
  const to = req.query.to as string | undefined
  const date = req.query.date as string | undefined
  if (!artist_id) {
    res.status(400).json({ error: 'artist_id wajib' })
    return
  }
  let start: Date
  let end: Date
  if (from && to) {
    start = new Date(`${from}T00:00:00`)
    end = new Date(`${to}T23:59:59`)
  } else if (date) {
    start = new Date(`${date}T00:00:00`)
    end = new Date(`${date}T23:59:59`)
  } else {
    res.status(400).json({ error: 'from/to atau date wajib' })
    return
  }
  const bookings = await prisma.booking.findMany({
    where: {
      artist_id,
      scheduled_at: { gte: start, lte: end },
    },
    include: { client: true },
    orderBy: { scheduled_at: 'asc' },
  })
  res.json(bookings)
})

// Artist check-in: confirmed → checked_in, record timestamp via updated_at
router.post('/:id/check-in', async (req, res) => {
  const id = Number(req.params.id)
  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) {
    res.status(404).json({ error: 'Booking tidak ditemukan' })
    return
  }
  if (booking.status !== 'confirmed' && booking.status !== 'checked_in') {
    res.status(409).json({
      error: `Check-in hanya untuk booking confirmed. Status saat ini: ${booking.status}`,
    })
    return
  }
  const updated = await prisma.booking.update({
    where: { id },
    data: { status: 'checked_in' },
    include: { client: true, artist: true },
  })

  sendBookingCheckedInWA({
    phone: updated.client?.phone ?? '',
    clientName: updated.client?.full_name ?? '',
    bookingId: updated.id,
    serviceName: updated.service_package,
    artistName: updated.artist?.name,
    artistPhone: updated.artist?.phone,
  }).catch(() => {})

  res.json(updated)
})

// Mark complete: checked_in → completed
router.post('/:id/complete', async (req, res) => {
  const id = Number(req.params.id)
  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) {
    res.status(404).json({ error: 'Booking tidak ditemukan' })
    return
  }
  if (booking.status !== 'checked_in') {
    res.status(409).json({
      error: `Complete hanya untuk booking checked_in. Status saat ini: ${booking.status}`,
    })
    return
  }
  const updated = await prisma.booking.update({
    where: { id },
    data: { status: 'completed' },
    include: { client: true, artist: true },
  })

  sendBookingCompletedWA({
    phone: updated.client?.phone ?? '',
    clientName: updated.client?.full_name ?? '',
    bookingId: updated.id,
    serviceName: updated.service_package,
    artistName: updated.artist?.name,
    artistPhone: updated.artist?.phone,
  }).catch(() => {})

  res.json(updated)
})

// Reschedule via drag-and-drop: move scheduled_at to new time
const rescheduleSchema = z.object({
  scheduled_at: z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Invalid datetime format' }),
})

router.post('/:id/reschedule', async (req, res) => {
  const id = Number(req.params.id)
  const parsed = rescheduleSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }
  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) {
    res.status(404).json({ error: 'Booking tidak ditemukan' })
    return
  }
  if (['cancelled', 'cancelled_penalty_applied', 'completed'].includes(booking.status)) {
    res.status(409).json({ error: 'Booking yang sudah selesai/dibatalkan tidak bisa reschedule' })
    return
  }

  const newStart = new Date(parsed.data.scheduled_at)
  // Estimate duration: 60 min default, or 90/120 based on package name
  const durationMin =
    /mega/i.test(booking.service_package) ? 120 :
    /volume/i.test(booking.service_package) ? 90 : 60
  const rules = await prisma.businessRule.findUnique({ where: { id: 1 } })
  const bufferMin = rules?.buffer_minutes ?? 30
  const newEnd = new Date(newStart.getTime() + durationMin * 60000)

  const conflicting = await prisma.booking.findFirst({
    where: {
      artist_id: booking.artist_id,
      id: { not: id },
      status: { in: ['pending_deposit', 'confirmed', 'checked_in'] },
      AND: [
        { scheduled_at: { lt: new Date(newEnd.getTime() + bufferMin * 60000) } },
        { scheduled_at: { gt: new Date(newStart.getTime() - bufferMin * 60000) } },
      ],
    },
  })
  if (conflicting) {
    res.status(409).json({ error: 'Slot tujuan bentrok dengan booking lain' })
    return
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { scheduled_at: newStart },
    include: { client: true, artist: true },
  })

  sendBookingRescheduledWA({
    phone: updated.client?.phone ?? '',
    clientName: updated.client?.full_name ?? '',
    bookingId: updated.id,
    serviceName: updated.service_package,
    newScheduledAt: updated.scheduled_at,
    artistName: updated.artist?.name,
    artistPhone: updated.artist?.phone,
  }).catch(() => {})

  res.json(updated)
})

// Generate available slots for an artist on a given date
// Returns: [{ start: ISO, end: ISO, available: boolean, reason?: string }]
router.get('/slots', async (req, res) => {
  const artist_id = Number(req.query.artist_id)
  const date = req.query.date as string  // YYYY-MM-DD
  const pkgId = (req.query.package as string | undefined) ?? 'classic'
  const location_type = (req.query.location_type as string | undefined) ?? 'studio'
  if (!artist_id || !date) {
    res.status(400).json({ error: 'artist_id & date wajib' })
    return
  }
  const artist = await prisma.artist.findUnique({ where: { id: artist_id } })
  if (!artist || !artist.is_active) {
    res.status(404).json({ error: 'Artist tidak ditemukan' })
    return
  }
  const pkg = SERVICE_PACKAGES.find((p) => p.id === pkgId) ?? SERVICE_PACKAGES[0]
  const rules = await prisma.businessRule.findUnique({ where: { id: 1 } })

  if (location_type === 'studio' && (rules?.allow_studio === false || artist.allows_studio === false)) {
    res.json({ artist, package: pkg, slots: [] })
    return
  }
  if (location_type === 'home_service' && (rules?.allow_home_service === false || artist.allows_home_service === false)) {
    res.json({ artist, package: pkg, slots: [] })
    return
  }

  const bufferMin = rules?.buffer_minutes ?? 30
  const durationMin = pkg.duration_minutes

  // Determine working hours based on location_type
  const startTimeStr = location_type === 'home_service'
    ? (artist.home_service_start_time || artist.start_time)
    : artist.start_time
  const endTimeStr = location_type === 'home_service'
    ? (artist.home_service_end_time || artist.end_time)
    : artist.end_time

  // Artist work hours HH:mm -> WIB timezone (+07:00)
  const [shStr, smStr] = startTimeStr.split(':')
  const [ehStr, emStr] = endTimeStr.split(':')
  const sh = (shStr || '00').padStart(2, '0')
  const sm = (smStr || '00').padStart(2, '0')
  const eh = (ehStr || '00').padStart(2, '0')
  const em = (emStr || '00').padStart(2, '0')

  const workStart = new Date(`${date}T${sh}:${sm}:00+07:00`)
  let workEnd = new Date(`${date}T${eh}:${em}:00+07:00`)

  if (workEnd.getTime() <= workStart.getTime()) {
    workEnd = new Date(workEnd.getTime() + 24 * 60 * 60 * 1000)
  }

  // Existing bookings for the day
  const existing = await prisma.booking.findMany({
    where: {
      artist_id,
      status: { in: ['pending_deposit', 'confirmed', 'checked_in'] },
      scheduled_at: {
        gte: new Date(workStart.getTime() - bufferMin * 60000),
        lte: new Date(workEnd.getTime() + bufferMin * 60000),
      },
    },
    orderBy: { scheduled_at: 'asc' },
  })

  // Generate candidate slots every 30 minutes from workStart
  // A slot starts at t, ends at t+duration; needs buffer to next.
  // Slot is available if no existing booking overlaps [t-buffer, t+duration+buffer]
  const slots: Array<{
    start: string
    end: string
    available: boolean
  }> = []
  const now = new Date()
  for (let t = new Date(workStart); t.getTime() + durationMin * 60000 <= workEnd.getTime(); t = new Date(t.getTime() + 30 * 60000)) {
    const slotStart = new Date(t)
    const slotEnd = new Date(t.getTime() + durationMin * 60000)
    const bufStart = new Date(slotStart.getTime() - bufferMin * 60000)
    const bufEnd = new Date(slotEnd.getTime() + bufferMin * 60000)
    const conflict = existing.find((b) => {
      const bStart = b.scheduled_at
      const bDur = pkgDuration(b.service_package)
      const bEnd = new Date(bStart.getTime() + bDur * 60000)
      return bStart < bufEnd && bEnd > bufStart
    })
    const inPast = slotStart.getTime() < now.getTime()
    slots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      available: !conflict && !inPast,
    })
  }
  res.json({ artist, package: pkg, slots })
})

// Public: lookup booking by email (for client manage page)
router.get('/lookup', async (req, res) => {
  const email = (req.query.email as string | undefined)?.toLowerCase().trim()
  if (!email) {
    res.status(400).json({ error: 'email wajib' })
    return
  }
  const client = await prisma.client.findUnique({
    where: { email },
    include: {
      bookings: {
        include: { artist: true },
        orderBy: { scheduled_at: 'desc' },
        take: 20,
      },
    },
  })
  if (!client) {
    res.status(404).json({ error: 'Tidak ada booking dengan email tersebut' })
    return
  }
  res.json(client)
})

// Public: get booking by id (with client + artist + photos)
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { client: true, artist: true, photos: true },
  })
  if (!booking) {
    res.status(404).json({ error: 'Booking tidak ditemukan' })
    return
  }
  res.json(booking)
})

export default router
