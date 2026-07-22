import { useEffect, useState } from 'react'
import { CreditCard, X, CheckCircle2, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api'
import type { Booking } from '@/shared/types'

interface DokuPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  paymentUrl: string
  bookingId: number
  onPaymentSuccess?: (updatedBooking: Booking) => void
}

export default function DokuPaymentModal({
  isOpen,
  onClose,
  paymentUrl,
  bookingId,
  onPaymentSuccess,
}: DokuPaymentModalProps) {
  const [isSuccess, setIsSuccess] = useState(false)

  // Auto-poll booking status while modal is open to detect real-time VA payment completion
  useEffect(() => {
    if (!isOpen || !bookingId || isSuccess) return

    const interval = setInterval(async () => {
      try {
        const updated = await api.bookings.get(bookingId)
        if (updated && (updated.status === 'confirmed' || (updated.deposit_paid ?? 0) > 0)) {
          setIsSuccess(true)
          if (onPaymentSuccess) {
            onPaymentSuccess(updated)
          }
        }
      } catch (err) {
        console.warn('[DOKU Poll Error]', err)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isOpen, bookingId, isSuccess, onPaymentSuccess])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-white shadow-2xl border border-salon-sand/50 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-salon-charcoal text-salon-cream px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <CreditCard className="h-5 w-5 text-salon-sand" />
            <div>
              <h3 className="font-serif text-base font-medium tracking-wide">
                Pembayaran Deposit (DOKU)
              </h3>
              <p className="text-[10px] text-salon-sand/80">ID Booking: #{bookingId}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-salon-sand hover:text-white flex items-center gap-1 transition-colors underline"
              title="Buka di tab baru jika browser memblokir iframe"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Buka Tab Baru
            </a>
            <button
              onClick={onClose}
              className="text-salon-cream/70 hover:text-white transition-colors p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="relative flex-1 min-h-[540px] bg-gray-50 overflow-hidden">
          {isSuccess ? (
            <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 duration-500">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-700 mb-6">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="font-serif text-2xl text-salon-charcoal mb-2">
                Pembayaran Berhasil!
              </h2>
              <p className="text-sm text-salon-taupe max-w-sm mb-6">
                Deposit Virtual Account Anda telah terverifikasi. Reservasi Anda resmi terkonfirmasi.
              </p>
              <button
                onClick={onClose}
                className="bg-salon-charcoal text-salon-cream hover:bg-salon-brown px-8 py-3 text-xs tracking-salon transition-colors"
              >
                LIHAT RIGIAN RESERVASI
              </button>
            </div>
          ) : (
            <iframe
              src={paymentUrl}
              className="w-full h-full min-h-[540px] border-0"
              title="DOKU Payment Gateway"
              allow="payment"
            />
          )}
        </div>

        {/* Footer info bar */}
        <div className="bg-salon-cream/40 border-t border-salon-sand/30 px-6 py-3 text-[11px] text-salon-taupe flex items-center justify-between shrink-0">
          <span>🔒 Pembayaran aman dilindungi oleh DOKU Payment Gateway</span>
          <button
            onClick={onClose}
            className="text-salon-charcoal hover:underline font-medium"
          >
            Tutup Window
          </button>
        </div>
      </div>
    </div>
  )
}
