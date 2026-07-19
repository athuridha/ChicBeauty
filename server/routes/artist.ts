import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

router.get('/', async (_req, res) => {
  const artists = await prisma.artist.findMany({
    where: { is_active: true, role: 'artist' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      start_time: true,
      end_time: true,
      is_active: true,
      created_at: true,
    },
  })
  res.json(artists)
})

export default router
