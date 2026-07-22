import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, Clock, Upload, AlertCircle, Check, X, MapPin, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import DokuPaymentModal from '@/components/doku-payment-modal'
import type { Booking, BookingStatus } from '@/shared/types'

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending_deposit: 'Pending Deposit',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  completed: 'Completed',
  cancelled: 'Cancelled',
  cancelled_penalty_applied: 'Cancelled + Penalty',
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending_deposit: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  checked_in: 'bg-sky-100 text-sky-800 border-sky-200',
  completed: 'bg-salon-sand/30 text-salon-charcoal border-salon-sand',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  cancelled_penalty_applied: 'bg-red-100 text-red-800 border-red-200',
}

function fmtMoney(n: number | null) {
  if (n === null || n === undefined) return '-'
  return `Rp${Number(n).toLocaleString('id-ID')}`
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const bookingId = Number(id)
  const navigate = useNavigate()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dokuLoading, setDokuLoading] = useState(false)
  const [dokuUrl, setDokuUrl] = useState('')
  const [dokuModalOpen, setDokuModalOpen] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleDokuPayment() {
    if (!booking) return
    setDokuLoading(true)
    try {
      const res = await api.doku.createPayment(booking.id)
      if (res.ok && res.paymentUrl) {
        setDokuUrl(res.paymentUrl)
        setDokuModalOpen(true)
        toast.success('Halaman pembayaran Virtual Account DOKU terbuka!')
      } else {
        toast.error('Gagal membuat sesi pembayaran DOKU', {
          description: res.error || 'Silakan gunakan opsi upload deposit manual di bawah.',
        })
      }
    } catch (err) {
      toast.error('Gagal memproses pembayaran DOKU', {
        description: err instanceof Error ? err.message : 'Silakan gunakan opsi upload deposit manual di bawah.',
      })
    } finally {
      setDokuLoading(false)
    }
  }

  useEffect(() => {
    if (!bookingId) return
    api.bookings
      .get(bookingId)
      .then(setBooking)
      .catch((e) => setError(e instanceof Error ? e.message : 'Booking tidak ditemukan'))
      .finally(() => setLoading(false))
  }, [bookingId])

  async function handleUploadDeposit(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !booking) return
    setUploading(true)
    try {
      const updated = await api.bookings.uploadDeposit(booking.id, file)
      setBooking(updated)
      toast.success('Deposit berhasil diupload! Booking terkonfirmasi.')
    } catch (err) {
      toast.error('Gagal upload deposit', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleCancel() {
    if (!booking) return
    if (!confirm('Yakin batalkan booking? Deposit mungkin hangus jika kurang dari 24 jam sebelum jadwal.')) return
    setCanceling(true)
    try {
      const result = await api.bookings.cancel(booking.id)
      const updated = await api.bookings.get(booking.id)
      setBooking(updated)
      if (result.penalty_applied !== null && result.penalty_applied > 0) {
        toast.warning('Booking dibatalkan dengan penalty', {
          description: `Deposit hangus: ${fmtMoney(result.penalty_applied)}`,
        })
      } else {
        toast.success('Booking dibatalkan tanpa penalty')
      }
    } catch (e) {
      toast.error('Gagal batalkan booking', {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setCanceling(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-salon-cream pt-32 pb-24 px-6 flex items-center justify-center text-salon-taupe">
        Memuat…
      </main>
    )
  }

  if (error || !booking) {
    return (
      <main className="min-h-screen bg-salon-cream pt-32 pb-24 px-6 flex items-center justify-center">
        <div className="w-full max-w-md bg-white p-8 md:p-10 shadow-2xl border border-salon-sand/40 text-center space-y-6">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="font-serif text-2xl text-salon-charcoal">Booking tidak ditemukan</h1>
          <p className="text-sm text-salon-taupe leading-relaxed">{error ?? 'ID tidak valid.'}</p>
          <button 
            onClick={() => navigate('/booking/manage')}
            className="w-full bg-salon-charcoal text-salon-cream hover:bg-salon-brown py-3.5 text-xs tracking-salon transition-colors flex items-center justify-center"
          >
            <Calendar className="mr-2 h-4 w-4" />
            CARI VIA EMAIL
          </button>
        </div>
      </main>
    )
  }

  const status = booking.status as BookingStatus
  const canUploadDeposit = status === 'pending_deposit' || status === 'confirmed'
  const canCancel = status === 'pending_deposit' || status === 'confirmed'

  return (
    <main className="min-h-screen bg-salon-cream pt-32 pb-24 px-6 flex items-center justify-center">
      <div className="w-full max-w-md bg-white p-8 md:p-10 shadow-2xl border border-salon-sand/40">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs tracking-salon text-salon-taupe">BOOKING ID</span>
              <span className="font-mono text-xl font-bold text-salon-charcoal">#{booking.id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-[10px] tracking-salon px-3 py-1 border ${STATUS_COLORS[status]} uppercase`}>
                {STATUS_LABELS[status]}
              </span>
            </div>
            <h1 className="font-serif text-3xl text-salon-charcoal">
              {booking.client?.full_name ?? 'Klien'}
            </h1>
            <p className="text-xs tracking-salon text-salon-taupe">
              {booking.service_package} — {booking.location_type === 'home_service' ? 'Home Service' : 'Studio'}
            </p>
          </div>
          <div className="space-y-4">
          <div className="space-y-2 rounded-md bg-muted/50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Lokasi
              </span>
              <span className="font-medium text-right max-w-[200px]">
                {booking.location_type === 'home_service' ? 'Home Service' : 'Studio'}
                {booking.location_type === 'home_service' && booking.address && (
                  <span className="block text-xs font-normal text-muted-foreground mt-1">
                    {booking.address}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Tanggal
              </span>
              <span className="font-medium">
                {new Date(booking.scheduled_at).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                Jam
              </span>
              <span className="font-medium">
                {(() => {
                  const d = new Date(booking.scheduled_at)
                  return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`
                })()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Artist
              </span>
              <span className="font-medium">
                {booking.artist?.name ?? '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Deposit dibayar</span>
              <span className="font-medium">{fmtMoney(booking.deposit_paid)}</span>
            </div>
            {booking.penalty_applied !== null && (
              <div className="flex items-center justify-between text-red-700">
                <span className="flex items-center gap-2">
                  <X className="h-4 w-4" />
                  Penalty
                </span>
                <span className="font-medium">{fmtMoney(booking.penalty_applied)}</span>
              </div>
            )}
          </div>

          {/* Payment Options */}
          {status === 'pending_deposit' && (
            <div className="space-y-4">
              <Button
                type="button"
                onClick={handleDokuPayment}
                disabled={dokuLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3.5 px-4 text-xs tracking-salon transition-all duration-300 flex items-center justify-center gap-2 rounded-md shadow-sm"
              >
                <CreditCard className="h-4 w-4" />
                {dokuLoading ? 'MEMPROSES DOKU…' : 'BAYAR DEPOSIT VIA VIRTUAL ACCOUNT (DOKU)'}
              </Button>
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-3 text-[10px] text-gray-400 font-medium uppercase tracking-wider">atau upload manual</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>
            </div>
          )}

          {/* Deposit upload */}
          {canUploadDeposit && (
            <div className="rounded-md border border-dashed p-4 space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <Upload className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">Upload Bukti Deposit Manual</p>
                  <p className="text-xs text-muted-foreground">
                    JPG/PNG, maks 5MB. Status berubah jadi confirmed otomatis.
                  </p>
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleUploadDeposit}
                disabled={uploading}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
              />
            </div>
          )}

          {status === 'confirmed' && (
            <div className="flex items-start gap-2.5 rounded-md bg-green-50 p-4 text-sm text-green-800 border border-green-200/60">
              <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-green-900">Booking Terkonfirmasi</p>
                <p className="text-xs text-green-700 mt-1 leading-relaxed">
                  {booking.location_type === 'home_service' 
                    ? `Notifikasi WA otomatis telah dikirim ke Artist (${booking.artist?.name ?? 'Artist'}) & Management. Artist akan datang ke lokasi Anda.` 
                    : `Notifikasi WA otomatis telah dikirim ke Artist (${booking.artist?.name ?? 'Artist'}) & Management. Sampai jumpa di studio!`}
                </p>
              </div>
            </div>
          )}

          {status === 'checked_in' && (
            <div className="flex items-center gap-2 rounded-md bg-sky-50 p-3 text-sm text-sky-700">
              <Check className="h-4 w-4" />
              Klien sudah check-in. Notifikasi WA otomatis telah dikirim.
            </div>
          )}

          {status === 'completed' && (
            <div className="rounded-md bg-muted/30 p-3 text-sm text-muted-foreground text-center">
              Treatment selesai. Terima kasih!
            </div>
          )}

          {(status === 'cancelled' || status === 'cancelled_penalty_applied') && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              Booking ini sudah dibatalkan.
            </div>
          )}

          {canCancel && (
            <Button
              variant="outline"
              className="w-full text-destructive hover:bg-destructive/10"
              disabled={canceling}
              onClick={handleCancel}
            >
              {canceling ? 'Memproses…' : 'Batalkan Booking'}
            </Button>
          )}
        </div>
      </div>

      <DokuPaymentModal
        isOpen={dokuModalOpen}
        onClose={() => setDokuModalOpen(false)}
        paymentUrl={dokuUrl}
        bookingId={booking.id}
        onPaymentSuccess={(updated) => {
          setBooking(updated)
          setDokuModalOpen(false)
          toast.success('Deposit terverifikasi! Status booking terkonfirmasi.')
        }}
      />
    </div>
  </main>
  )
}
