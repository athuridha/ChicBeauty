import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const client = await prisma.client.findUnique({ where: { id } })
  if (!client) {
    res.status(404).json({ error: 'Client tidak ditemukan' })
    return
  }
  res.json(client)
})

router.get('/:id/bookings', async (req, res) => {
  const id = Number(req.params.id)
  const bookings = await prisma.booking.findMany({
    where: { client_id: id },
    include: { artist: true, photos: true },
    orderBy: { scheduled_at: 'desc' },
  })
  res.json(bookings)
})

export default router
