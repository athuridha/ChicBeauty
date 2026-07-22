import app from './index'
import { ensureUploadDir } from './lib/upload'
import { PrismaClient } from '@prisma/client'
import { sendEmail } from './lib/email'
import { sendBookingCancelledWA } from './lib/fonnte'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'

const PORT = Number(process.env.PORT ?? 3000)

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
      include: { client: true, artist: true },
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
      await sendBookingCancelledWA({
        phone: b.client?.phone ?? '',
        clientName: b.client?.full_name ?? '',
        bookingId: b.id,
        reason: 'Deposit 50% tidak diterima dalam waktu 2 jam',
        artistName: b.artist?.name,
        artistPhone: b.artist?.phone,
      }).catch(() => {})
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

  // Serve built frontend in production (non-Vercel self-hosted)
  if (process.env.NODE_ENV === 'production') {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const dist = path.resolve(__dirname, '../dist')
    app.use(express.static(dist))
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
  }

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
