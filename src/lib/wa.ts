export function formatWaNumber(phone: string): string {
  if (!phone) return ''
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1)
  }
  return cleaned
}

export function buildArtistBookingWaLink(params: {
  bookingId: number | string
  artistName: string
  artistPhone: string
  clientName: string
  clientPhone: string
  packageName: string
  locationType: string
  address?: string | null
  scheduledAt: string | Date
}): string {
  const waPhone = formatWaNumber(params.artistPhone)
  const d = new Date(params.scheduledAt)
  const dateStr = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const timeStr = `${hours}.${minutes}`
  const locStr = params.locationType === 'home_service' ? 'Home Service (Kunjungan Rumah)' : 'Di Studio'

  let message = `Halo Kak ${params.artistName}! 👋\n`
  message += `Ada pesanan reservasi baru dari *ChicBeauty*:\n\n`
  message += `📋 *DETAIL RESERVASI*\n`
  message += `• ID Booking: #${params.bookingId}\n`
  message += `• Nama Pelanggan: ${params.clientName}\n`
  message += `• No. HP Pelanggan: ${params.clientPhone}\n`
  message += `• Paket Treatment: ${params.packageName}\n`
  message += `• Lokasi: ${locStr}\n`
  if (params.locationType === 'home_service' && params.address) {
    message += `• Alamat Pelanggan: ${params.address}\n`
  }
  message += `• Tanggal: ${dateStr}\n`
  message += `• Waktu: ${timeStr} WIB\n\n`
  message += `Mohon konfirmasi dan persiapkan layanannya ya Kak. Terima kasih! ✨`

  return `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`
}

export function buildClientWaLink(params: {
  clientPhone: string
  clientName: string
  bookingId: number | string
}): string {
  const waPhone = formatWaNumber(params.clientPhone)
  let message = `Halo Kak ${params.clientName}! 👋\n`
  message += `Terima kasih telah melakukan reservasi di *ChicBeauty* (ID Booking #${params.bookingId}).\n`
  return `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`
}
