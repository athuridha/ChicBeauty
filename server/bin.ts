import app from './index'
import { ensureUploadDir } from './lib/upload'
import { PrismaClient } from '@prisma/client'
import { sendEmail } from './lib/email'

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
