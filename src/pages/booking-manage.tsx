import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Clock, User, AlertCircle, ArrowRight, Search, MapPin } from 'lucide-react'
import { toast } from 'sonner'

import { api } from '@/lib/api'
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

export default function BookingManagePage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [searched, setSearched] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setSearched(false)
    try {
      const data = await api.bookings.lookup(email)
      setBookings((data as any).bookings ?? [])
      setSearched(true)
    } catch (err) {
      setBookings([])
      setSearched(true)
      toast.error('Pencarian gagal', {
        description: err instanceof Error ? err.message : 'Email tidak ditemukan.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-salon-cream pb-24">
      {/* ─── HEADER ─── */}
      <div className="bg-salon-charcoal text-salon-cream pt-32 pb-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('/hero-lash.png')] bg-cover bg-center mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-salon-charcoal/50 to-salon-charcoal" />
        
        <div className="relative mx-auto max-w-3xl text-center z-10">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl tracking-tight mb-6">
            Kelola Booking
          </h1>
          <p className="text-sm md:text-base text-salon-cream/70 max-w-lg mx-auto leading-relaxed">
            Lacak status, upload bukti deposit, atau batalkan jadwal treatment Anda melalui email yang digunakan saat reservasi.
          </p>
        </div>
      </div>

      {/* ─── SEARCH SECTION ─── */}
      <div className="mx-auto max-w-3xl px-6 -mt-8 relative z-20">
        <div className="bg-white p-2 shadow-2xl flex flex-col md:flex-row gap-2">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <input
                type="email"
                placeholder="Masukkan alamat email Anda..."
                className="w-full h-12 border-0 bg-transparent px-4 text-salon-charcoal placeholder-salon-taupe/50 focus:ring-0 focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-salon-charcoal text-salon-cream px-8 h-12 text-xs tracking-salon hover:bg-salon-brown transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
            >
              {loading ? 'MENCARI...' : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  CARI
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ─── RESULTS ─── */}
      {searched && (
        <section className="mx-auto max-w-3xl px-6 mt-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-serif text-2xl text-salon-charcoal">Hasil Pencarian</h2>
            <span className="text-xs tracking-salon text-salon-taupe">{bookings.length} BOOKING DITEMUKAN</span>
          </div>

          {bookings.length === 0 ? (
            <div className="border border-dashed border-salon-sand/60 py-16 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-salon-sand mb-4" />
              <p className="text-salon-charcoal font-serif text-xl mb-2">Tidak ada booking</p>
              <p className="text-sm text-salon-taupe max-w-sm mx-auto">
                Kami tidak menemukan data reservasi aktif atau riwayat untuk email <code className="font-mono text-salon-charcoal bg-salon-sand/20 px-1 py-0.5 ml-1">{email}</code>
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {bookings.map((b) => {
                const status = b.status as BookingStatus
                return (
                  <div key={b.id} className="bg-white border border-salon-sand/40 p-6 md:p-8 hover:shadow-lg hover:border-salon-sand/60 transition-all duration-300 group flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs tracking-salon text-salon-taupe mb-1">ID #{b.id}</p>
                          <h3 className="font-serif text-2xl text-salon-charcoal">{b.service_package}</h3>
                        </div>
                        <span className={`text-[10px] tracking-salon px-3 py-1 border ${STATUS_COLORS[status]} uppercase`}>
                          {STATUS_LABELS[status]}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                        <div className="space-y-1">
                          <span className="text-[10px] tracking-salon text-salon-taupe flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" /> TANGGAL
                          </span>
                          <p className="text-sm font-medium text-salon-charcoal">
                            {new Date(b.scheduled_at).toLocaleDateString('id-ID', {
                              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                            })}
                          </p>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-[10px] tracking-salon text-salon-taupe flex items-center gap-1.5">
                            <Clock className="h-3 w-3" /> WAKTU
                          </span>
                          <p className="text-sm font-medium text-salon-charcoal">
                            {(() => {
                              const d = new Date(b.scheduled_at)
                              return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`
                            })()}
                          </p>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-[10px] tracking-salon text-salon-taupe flex items-center gap-1.5">
                            <User className="h-3 w-3" /> ARTIST
                          </span>
                          <p className="text-sm font-medium text-salon-charcoal">
                            {b.artist?.name ?? '-'}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] tracking-salon text-salon-taupe flex items-center gap-1.5">
                            <MapPin className="h-3 w-3" /> LOKASI
                          </span>
                          <p className="text-sm font-medium text-salon-charcoal">
                            {b.location_type === 'home_service' ? 'Home Service' : 'Studio'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="md:border-l md:border-salon-sand/40 md:pl-6 flex flex-col justify-end pt-4 md:pt-0 border-t border-salon-sand/40 md:border-t-0">
                      <Link 
                        to={`/booking/${b.id}`}
                        className="flex items-center justify-between text-xs tracking-salon text-salon-charcoal group-hover:text-salon-brown transition-colors w-full md:w-auto"
                      >
                        LIHAT DETAIL
                        <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}
    </main>
  )
}
