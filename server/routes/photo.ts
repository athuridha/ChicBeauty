import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { upload } from '../lib/upload'
import { requireAuth } from '../middleware/auth'

const router = Router()

// List photos for a booking
router.get('/booking/:id/photos', async (req, res) => {
  const id = Number(req.params.id)
  const photos = await prisma.beforeAfterPhoto.findMany({
    where: { booking_id: id },
    orderBy: { uploaded_at: 'asc' },
  })
  res.json(photos)
})

// Upload before/after photo (max 2 per booking — PRD Section 3)
router.post(
  '/booking/:id/photos',
  requireAuth,
  upload.single('file'),
  async (req, res) => {
    const id = Number(req.params.id)
    if (!req.file) {
      res.status(400).json({ error: 'File wajib diupload' })
      return
    }
    const booking = await prisma.booking.findUnique({ where: { id } })
    if (!booking) {
      res.status(404).json({ error: 'Booking tidak ditemukan' })
      return
    }
    const count = await prisma.beforeAfterPhoto.count({
      where: { booking_id: id },
    })
    if (count >= 2) {
      res.status(409).json({ error: 'Maksimal 2 foto per booking' })
      return
    }

    const caption = (req.body.caption as string | undefined) ?? null
    const photo = await prisma.beforeAfterPhoto.create({
      data: {
        booking_id: id,
        file_path: `/uploads/${req.file.filename}`,
        caption,
        uploaded_by_artist_id: req.user!.id,
      },
    })
    res.status(201).json(photo)
  },
)

// Delete photo (artist/admin owner only)
router.delete('/photo/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const photo = await prisma.beforeAfterPhoto.findUnique({ where: { id } })
  if (!photo) {
    res.status(404).json({ error: 'Foto tidak ditemukan' })
    return
  }
  if (photo.uploaded_by_artist_id !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Tidak punya akses' })
    return
  }
  await prisma.beforeAfterPhoto.delete({ where: { id } })
  res.json({ ok: true })
})

export default router
