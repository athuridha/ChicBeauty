import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()

// Public: Get all active service packages
router.get('/', async (_req, res) => {
  try {
    const packages = await prisma.servicePackage.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'asc' },
    })
    res.json(packages)
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat paket layanan' })
  }
})

// Admin: Get all service packages (active and inactive)
router.get('/admin', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const packages = await prisma.servicePackage.findMany({
      orderBy: { created_at: 'asc' },
    })
    res.json(packages)
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat semua paket layanan' })
  }
})

// Admin: Create a new service package
router.post('/admin', requireAuth, requireAdmin, async (req, res) => {
  const { name, duration_minutes, price, description, is_active } = req.body

  if (!name || !duration_minutes || !price || !description) {
    res.status(400).json({ error: 'Semua kolom data (nama, durasi, harga, deskripsi) wajib diisi' })
    return
  }

  // Generate ID from name
  const id = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')

  try {
    const existing = await prisma.servicePackage.findUnique({ where: { id } })
    if (existing) {
      res.status(409).json({ error: 'Layanan dengan nama/ID tersebut sudah ada' })
      return
    }

    const pkg = await prisma.servicePackage.create({
      data: {
        id,
        name,
        duration_minutes: Number(duration_minutes),
        price: Number(price),
        description,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
      },
    })
    res.status(201).json(pkg)
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan paket layanan baru' })
  }
})

// Admin: Update an existing service package
router.put('/admin/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params
  const { name, duration_minutes, price, description, is_active } = req.body

  try {
    const existing = await prisma.servicePackage.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ error: 'Paket layanan tidak ditemukan' })
      return
    }

    const pkg = await prisma.servicePackage.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        duration_minutes: duration_minutes !== undefined ? Number(duration_minutes) : existing.duration_minutes,
        price: price !== undefined ? Number(price) : existing.price,
        description: description !== undefined ? description : existing.description,
        is_active: is_active !== undefined ? Boolean(is_active) : existing.is_active,
      },
    })
    res.json(pkg)
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui data paket layanan' })
  }
})

// Admin: Delete a service package
router.delete('/admin/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params

  try {
    const existing = await prisma.servicePackage.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ error: 'Paket layanan tidak ditemukan' })
      return
    }

    await prisma.servicePackage.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus paket layanan' })
  }
})

export default router
