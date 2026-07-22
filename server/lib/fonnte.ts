export async function sendWhatsApp(target: string, message: string) {
  const token = process.env.FONNTE_TOKEN || 'Sr6pMPEdbwWHcyG4QSyQ'
  if (!target || !token) {
    console.log('[fonnte mock] Target or token missing:', { target, message })
    return null
  }

  // Sanitize phone number (keep digits and commas for multiple targets)
  const cleanTarget = target.replace(/[^0-9,]/g, '')
  if (!cleanTarget) return null

  try {
    const formData = new URLSearchParams()
    formData.append('target', cleanTarget)
    formData.append('message', message)
    formData.append('countryCode', '62')

    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token,
      },
      body: formData,
    })

    const data = (await res.json()) as Record<string, any>
    console.log('[fonnte response]', { target: cleanTarget, status: data?.status, detail: data })
    return data
  } catch (err) {
    console.error('[fonnte error]', err)
    return null
  }
}

// ─── HELPER NOTIFICATION TEMPLATES ───

export async function sendBookingCreatedWA(params: {
  phone: string
  clientName: string
  bookingId: number
  serviceName: string
  scheduledAt: Date
  locationType: string
  address?: string | null
  artistName?: string
}) {
  const dateStr = params.scheduledAt.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const timeStr = params.scheduledAt.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const locationText =
    params.locationType === 'home_service'
      ? `Home Service (${params.address || 'Alamat Klien'})`
      : 'Studio ChicBeauty'

  const message = `Halo Kak ${params.clientName}, Terima kasih telah melakukan pemesanan di ChicBeauty! ✨

*DETAIL RESERVASI*
• ID Booking: #${params.bookingId}
• Layanan: ${params.serviceName}
• Tanggal: ${dateStr}
• Waktu: ${timeStr} WIB
• Artist: ${params.artistName || '-'}
• Lokasi: ${locationText}

*PENDING DEPOSIT*
Silakan lakukan pembayaran deposit (50%) dan upload bukti pembayaran dalam waktu *2 jam* agar reservasi Anda tidak otomatis terbatalkan.

Cek status & upload bukti deposit di:
https://chicbeauty.codzy.net/booking/${params.bookingId}

Terima kasih,
ChicBeauty Team`

  return sendWhatsApp(params.phone, message)
}

export async function sendDepositConfirmedWA(params: {
  phone: string
  clientName: string
  bookingId: number
  serviceName: string
  depositAmount: number
  scheduledAt: Date
}) {
  const dateStr = params.scheduledAt.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const timeStr = params.scheduledAt.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const message = `Halo Kak ${params.clientName}, Deposit Anda telah BERHASIL Di-konfirmasi! 🎉

*STATUS: RESERVASI TERKONFIRMASI*
• ID Booking: #${params.bookingId}
• Layanan: ${params.serviceName}
• Tanggal: ${dateStr}
• Waktu: ${timeStr} WIB
• Deposit Diterima: Rp ${params.depositAmount.toLocaleString('id-ID')}

Terima kasih, kami siap menyambut Anda pada jadwal yang telah ditentukan! ✨

ChicBeauty Team`

  return sendWhatsApp(params.phone, message)
}

export async function sendBookingCheckedInWA(params: {
  phone: string
  clientName: string
  bookingId: number
  serviceName: string
  artistName?: string
}) {
  const message = `Halo Kak ${params.clientName}, Artist kami (${params.artistName || 'ChicBeauty Artist'}) telah melakukan Check-in untuk penanganan ID Booking #${params.bookingId} (${params.serviceName}).

Selamat menikmati perawatan terbaik dari ChicBeauty! ✨`

  return sendWhatsApp(params.phone, message)
}

export async function sendBookingCompletedWA(params: {
  phone: string
  clientName: string
  bookingId: number
  serviceName: string
}) {
  const message = `Halo Kak ${params.clientName}, Treatment ${params.serviceName} (ID #${params.bookingId}) telah SELESAI. 💖

Terima kasih telah mempercayakan kecantikan Anda kepada ChicBeauty! Sampai jumpa di perawatan berikutnya. ✨`

  return sendWhatsApp(params.phone, message)
}

export async function sendBookingRescheduledWA(params: {
  phone: string
  clientName: string
  bookingId: number
  serviceName: string
  newScheduledAt: Date
}) {
  const dateStr = params.newScheduledAt.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const timeStr = params.newScheduledAt.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const message = `Halo Kak ${params.clientName}, Jadwal reservasi ID #${params.bookingId} (${params.serviceName}) Anda telah DIPERBARUI. 🗓️

*JADWAL BARU*
• Tanggal: ${dateStr}
• Waktu: ${timeStr} WIB

Terima kasih,
ChicBeauty Team`

  return sendWhatsApp(params.phone, message)
}

export async function sendBookingCancelledWA(params: {
  phone: string
  clientName: string
  bookingId: number
  reason?: string
}) {
  const reasonText = params.reason ? ` (Alasan: ${params.reason})` : ''
  const message = `Halo Kak ${params.clientName}, Reservasi ID #${params.bookingId} telah DIBATALKAN${reasonText}.

Jika Anda membutuhkan reservasi baru, silakan lakukan pemesanan kembali di website kami https://chicbeauty.codzy.net/booking

ChicBeauty Team`

  return sendWhatsApp(params.phone, message)
}
