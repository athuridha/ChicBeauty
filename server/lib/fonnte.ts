export const OWNER_PHONE = process.env.OWNER_PHONE || '085213971757'

export async function sendWhatsApp(target: string | string[], message: string) {
  const token = process.env.FONNTE_TOKEN || 'Sr6pMPEdbwWHcyG4QSyQ'
  if (!target || !token) {
    console.log('[fonnte mock] Target or token missing:', { target, message })
    return null
  }

  // Handle single or multiple target numbers
  const targetArray = Array.isArray(target) ? target : [target]
  const cleanTargets = targetArray
    .filter(Boolean)
    .map((t) => t.replace(/[^0-9]/g, ''))
    .filter((t) => t.length >= 8)
    .filter((t, index, self) => self.indexOf(t) === index) // Unique targets

  if (cleanTargets.length === 0) return null

  const cleanTargetStr = cleanTargets.join(',')

  try {
    const formData = new URLSearchParams()
    formData.append('target', cleanTargetStr)
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
    console.log('[fonnte response]', { target: cleanTargetStr, status: data?.status, detail: data })
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
  artistPhone?: string | null
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

  // 1. Send Client Notification
  const clientMessage = `Halo Kak ${params.clientName}, Terima kasih telah melakukan pemesanan di ChicBeauty! ✨

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

  await sendWhatsApp(params.phone, clientMessage)

  // 2. Send Staff / Owner Notification (to Owner & Artist)
  const staffTargets = [OWNER_PHONE]
  if (params.artistPhone) staffTargets.push(params.artistPhone)

  const staffMessage = `🔔 *RESERVASI BARU DIBUAT (#${params.bookingId})*

• Klien: ${params.clientName} (${params.phone})
• Layanan: ${params.serviceName}
• Tanggal: ${dateStr}
• Waktu: ${timeStr} WIB
• Artist: ${params.artistName || '-'}
• Lokasi: ${locationText}
• Status: Pending Deposit (2 jam)`

  return sendWhatsApp(staffTargets, staffMessage)
}

export async function sendDepositConfirmedWA(params: {
  phone: string
  clientName: string
  bookingId: number
  serviceName: string
  depositAmount: number
  scheduledAt: Date
  artistName?: string
  artistPhone?: string | null
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

  // 1. Client notification
  const clientMessage = `Halo Kak ${params.clientName}, Deposit Anda telah BERHASIL Di-konfirmasi! 🎉

*STATUS: RESERVASI TERKONFIRMASI*
• ID Booking: #${params.bookingId}
• Layanan: ${params.serviceName}
• Tanggal: ${dateStr}
• Waktu: ${timeStr} WIB
• Deposit Diterima: Rp ${params.depositAmount.toLocaleString('id-ID')}

Terima kasih, kami siap menyambut Anda pada jadwal yang telah ditentukan! ✨

ChicBeauty Team`

  await sendWhatsApp(params.phone, clientMessage)

  // 2. Staff / Owner notification
  const staffTargets = [OWNER_PHONE]
  if (params.artistPhone) staffTargets.push(params.artistPhone)

  const staffMessage = `✅ *DEPOSIT TERKONFIRMASI (#${params.bookingId})*

• Klien: ${params.clientName} (${params.phone})
• Layanan: ${params.serviceName}
• Tanggal: ${dateStr} ${timeStr} WIB
• Artist: ${params.artistName || '-'}
• Deposit Diterima: Rp ${params.depositAmount.toLocaleString('id-ID')}`

  return sendWhatsApp(staffTargets, staffMessage)
}

export async function sendBookingCheckedInWA(params: {
  phone: string
  clientName: string
  bookingId: number
  serviceName: string
  artistName?: string
  artistPhone?: string | null
}) {
  // Client Notification
  const clientMessage = `Halo Kak ${params.clientName}, Artist kami (${params.artistName || 'ChicBeauty Artist'}) telah melakukan Check-in untuk penanganan ID Booking #${params.bookingId} (${params.serviceName}).

Selamat menikmati perawatan terbaik dari ChicBeauty! ✨`

  await sendWhatsApp(params.phone, clientMessage)

  // Owner Notification
  const staffMessage = `📍 *ARTIST CHECK-IN (#${params.bookingId})*

• Artist: ${params.artistName || '-'}
• Klien: ${params.clientName}
• Layanan: ${params.serviceName}`

  return sendWhatsApp(OWNER_PHONE, staffMessage)
}

export async function sendBookingCompletedWA(params: {
  phone: string
  clientName: string
  bookingId: number
  serviceName: string
  artistName?: string
  artistPhone?: string | null
}) {
  // Client Notification
  const clientMessage = `Halo Kak ${params.clientName}, Treatment ${params.serviceName} (ID #${params.bookingId}) telah SELESAI. 💖

Terima kasih telah mempercayakan kecantikan Anda kepada ChicBeauty! Sampai jumpa di perawatan berikutnya. ✨`

  await sendWhatsApp(params.phone, clientMessage)

  // Owner Notification
  const staffMessage = `🎉 *TREATMENT SELESAI (#${params.bookingId})*

• Klien: ${params.clientName}
• Layanan: ${params.serviceName}
• Artist: ${params.artistName || '-'}`

  return sendWhatsApp(OWNER_PHONE, staffMessage)
}

export async function sendBookingRescheduledWA(params: {
  phone: string
  clientName: string
  bookingId: number
  serviceName: string
  newScheduledAt: Date
  artistName?: string
  artistPhone?: string | null
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

  // Client Notification
  const clientMessage = `Halo Kak ${params.clientName}, Jadwal reservasi ID #${params.bookingId} (${params.serviceName}) Anda telah DIPERBARUI. 🗓️

*JADWAL BARU*
• Tanggal: ${dateStr}
• Waktu: ${timeStr} WIB

Terima kasih,
ChicBeauty Team`

  await sendWhatsApp(params.phone, clientMessage)

  // Owner & Artist Notification
  const staffTargets = [OWNER_PHONE]
  if (params.artistPhone) staffTargets.push(params.artistPhone)

  const staffMessage = `🗓️ *JADWAL RESERVASI DIPERBARUI (#${params.bookingId})*

• Klien: ${params.clientName} (${params.phone})
• Layanan: ${params.serviceName}
• Artist: ${params.artistName || '-'}
• Jadwal Baru: ${dateStr} ${timeStr} WIB`

  return sendWhatsApp(staffTargets, staffMessage)
}

export async function sendBookingCancelledWA(params: {
  phone: string
  clientName: string
  bookingId: number
  reason?: string
  artistName?: string
  artistPhone?: string | null
}) {
  const reasonText = params.reason ? ` (Alasan: ${params.reason})` : ''

  // Client Notification
  const clientMessage = `Halo Kak ${params.clientName}, Reservasi ID #${params.bookingId} telah DIBATALKAN${reasonText}.

Jika Anda membutuhkan reservasi baru, silakan lakukan pemesanan kembali di website kami https://chicbeauty.codzy.net/booking

ChicBeauty Team`

  await sendWhatsApp(params.phone, clientMessage)

  // Owner & Artist Notification
  const staffTargets = [OWNER_PHONE]
  if (params.artistPhone) staffTargets.push(params.artistPhone)

  const staffMessage = `❌ *RESERVASI DIBATALKAN (#${params.bookingId})*

• Klien: ${params.clientName} (${params.phone})
• Artist: ${params.artistName || '-'}
• Keterangan: ${params.reason || 'Dibatalkan'}`

  return sendWhatsApp(staffTargets, staffMessage)
}
