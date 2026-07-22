import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { createDokuCheckoutPayment } from '../lib/doku'
import { sendDepositConfirmedWA } from '../lib/fonnte'

const router = Router()

// 1. Create DOKU Checkout Payment URL for a booking
router.post('/create-payment/:bookingId', async (req, res) => {
  const bookingId = Number(req.params.bookingId)
  if (!bookingId) {
    res.status(400).json({ error: 'ID Booking tidak valid' })
    return
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { client: true, artist: true },
  })

  if (!booking) {
    res.status(404).json({ error: 'Booking tidak ditemukan' })
    return
  }

  if (booking.status !== 'pending_deposit' && booking.status !== 'confirmed') {
    res.status(400).json({ error: `Booking berstatus ${booking.status}, tidak membutuhkan pembayaran deposit` })
    return
  }

  // Calculate deposit amount
  const rules = await prisma.businessRule.findUnique({ where: { id: 1 } })
  const pct = rules?.deposit_percentage ?? 50
  const pkg = await prisma.servicePackage.findFirst({ where: { name: booking.service_package } })
  const price = pkg?.price ?? 200000
  const depositAmount = (price * pct) / 100

  const result = await createDokuCheckoutPayment({
    bookingId: booking.id,
    clientName: booking.client?.full_name || 'Pelanggan ChicBeauty',
    clientEmail: booking.client?.email || 'klien@mail.com',
    clientPhone: booking.client?.phone || '',
    packageName: booking.service_package,
    depositAmount,
  })

  if (!result.success) {
    res.status(500).json({ error: result.error || 'Gagal memproses pembayaran DOKU' })
    return
  }

  res.json({
    ok: true,
    paymentUrl: result.paymentUrl,
    invoiceNumber: result.invoiceNumber,
    depositAmount,
  })
})

// 2. DOKU Notification / Webhook Endpoint
// DOKU sends HTTP POST to this endpoint when Virtual Account payment is successful
router.post('/notification', async (req, res) => {
  console.log('[DOKU Webhook Body]', JSON.stringify(req.body, null, 2))

  try {
    const body = req.body || {}
    const invoiceNumber =
      body.order?.invoice_number ||
      body.invoice_number ||
      body.order_id ||
      ''

    const transactionStatus =
      body.transaction?.status ||
      body.status ||
      body.payment_status ||
      ''

    // Extract booking ID from invoice string e.g. "INV-CB-3-1721643444" -> 3
    let bookingId: number | null = null
    const match = invoiceNumber.match(/INV-CB-(\d+)-/)
    if (match && match[1]) {
      bookingId = Number(match[1])
    }

    if (!bookingId) {
      console.warn('[DOKU Webhook] Booking ID not found in invoice:', invoiceNumber)
      res.status(200).send('OK')
      return
    }

    // Check transaction success
    const isSuccess =
      transactionStatus.toUpperCase() === 'SUCCESS' ||
      transactionStatus.toUpperCase() === 'PAID' ||
      transactionStatus.toUpperCase() === '0000'

    if (isSuccess) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { client: true, artist: true },
      })

      if (booking) {
        // Calculate deposit
        const rules = await prisma.businessRule.findUnique({ where: { id: 1 } })
        const pct = rules?.deposit_percentage ?? 50
        const pkg = await prisma.servicePackage.findFirst({ where: { name: booking.service_package } })
        const price = pkg?.price ?? 200000
        const depositAmount = (price * pct) / 100

        const updated = await prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: 'confirmed',
            deposit_paid: depositAmount,
          },
          include: { client: true, artist: true },
        })

        console.log(`[DOKU Webhook] Booking #${bookingId} successfully confirmed via Virtual Account!`)

        // Send WhatsApp notification to Client, Owner (085213971757), and Artist automatically!
        await sendDepositConfirmedWA({
          phone: updated.client?.phone ?? '',
          clientName: updated.client?.full_name ?? '',
          bookingId: updated.id,
          serviceName: updated.service_package,
          depositAmount: Number(updated.deposit_paid ?? 0),
          scheduledAt: updated.scheduled_at,
          artistName: updated.artist?.name,
          artistPhone: updated.artist?.phone,
        }).catch((err) => console.error('[DOKU Webhook WA Error]', err))
      }
    }

    res.status(200).send('OK')
  } catch (err) {
    console.error('[DOKU Webhook Error]', err)
    res.status(200).send('OK')
  }
})

export default router
