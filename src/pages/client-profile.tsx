import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Mail, Phone, User, ImageOff } from 'lucide-react'

import { api } from '@/lib/api'
import type { Booking, BookingStatus, Client } from '@/shared/types'

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending_deposit: 'Pending Deposit',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  completed: 'Completed',
  cancelled: 'Cancelled',
  cancelled_penalty_applied: 'Cancelled + Penalty',
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending_deposit: 'bg-amber-50 text-amber-700 border-amber-200/50',
  confirmed: 'bg-green-50 text-green-700 border-green-200/50',
  checked_in: 'bg-sky-50 text-sky-700 border-sky-200/50',
  completed: 'bg-salon-cream text-salon-charcoal border-salon-sand/40',
  cancelled: 'bg-red-50 text-red-700 border-red-200/50',
  cancelled_penalty_applied: 'bg-red-50 text-red-700 border-red-200/50',
}

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const clientId = Number(id)
  const [client, setClient] = useState<Client | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null)

  useEffect(() => {
    if (!clientId) return
    Promise.all([
      api.clients.get(clientId),
      api.clients.history(clientId),
      api.auth.me().catch(() => null)
    ])
      .then(([c, b, user]) => {
        setClient(c)
        setBookings(b)
        setCurrentUser(user)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat data klien.'))
      .finally(() => setLoading(false))
  }, [clientId])

  const allPhotos = bookings.flatMap((b) =>
    (b.photos ?? []).map((p) => ({ ...p, booking: b })),
  )

  const backLink = currentUser?.role === 'admin' ? '/admin/clients' : '/dashboard/artist'
  const backLabel = currentUser?.role === 'admin' ? 'Database Klien' : 'Kalender Kerja'

  if (loading) {
    return (
      <main className="min-h-screen bg-salon-cream pt-24 pb-16 px-6 flex items-center justify-center text-salon-taupe">
        Memuat data profil klien…
      </main>
    )
  }

  if (error || !client) {
    return (
      <main className="min-h-screen bg-salon-cream pt-24 pb-16 px-6 flex items-center justify-center">
        <div className="w-full max-w-md bg-white p-8 border border-red-200 text-center space-y-4 text-red-700">
          <p className="font-serif text-lg font-bold">Terjadi Kesalahan</p>
          <p className="text-sm">{error ?? 'Klien tidak ditemukan.'}</p>
          <Link 
            to={backLink}
            className="inline-block bg-salon-charcoal text-salon-cream px-6 py-3 text-xs tracking-salon transition-colors"
          >
            KEMBALI
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-salon-cream pb-24">
      {/* ─── HEADER ─── */}
      <div className="bg-salon-charcoal text-salon-cream pt-24 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('/hero-lash.png')] bg-cover bg-center mix-blend-overlay" />
        
        <div className="relative mx-auto max-w-4xl flex flex-col justify-between items-start gap-4 z-10">
          <Link
            to={backLink}
            className="text-[10px] tracking-salon text-salon-cream/50 hover:text-salon-cream transition-colors uppercase flex items-center gap-1.5 mb-2"
          >
            <ArrowLeft className="h-3 w-3" /> {backLabel}
          </Link>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full">
            <div className="space-y-1">
              <span className="text-[10px] tracking-salon text-salon-cream/50 uppercase block">PROFIL PELANGGAN</span>
              <h1 className="font-serif text-4xl md:text-5xl tracking-tight">
                {client.full_name}
              </h1>
              <p className="text-xs text-salon-cream/60">
                Klien sejak {new Date(client.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            
            <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
              <User className="h-8 w-8 text-salon-cream" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── CONTENT CONTAINER ─── */}
      <div className="mx-auto max-w-4xl px-6 md:px-10 -mt-8 relative z-20 space-y-8">
        
        {/* Contact Info Card */}
        <div className="bg-white border border-salon-sand/40 p-6 md:p-8 shadow-xl flex flex-col sm:flex-row justify-between gap-6">
          <div className="space-y-4 flex-1">
            <h2 className="text-[10px] font-bold tracking-salon text-salon-taupe uppercase">INFORMASI KONTAK</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-salon-charcoal">
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-salon-taupe shrink-0" />
                <span className="truncate">{client.email}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-salon-taupe shrink-0" />
                <span>{client.phone}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gallery */}
        <div className="bg-white border border-salon-sand/40 p-6 md:p-8 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="font-serif text-2xl text-salon-charcoal">Galeri Sesi Treatment</h2>
            <p className="text-xs text-salon-taupe">
              {allPhotos.length} foto dari {bookings.filter((b) => (b.photos ?? []).length > 0).length} sesi pengerjaan
            </p>
          </div>

          {allPhotos.length === 0 ? (
            <div className="border border-dashed border-salon-sand/60 py-12 text-center text-salon-taupe">
              <ImageOff className="mx-auto mb-2 h-8 w-8 text-salon-sand" />
              <p className="text-xs">Belum ada dokumentasi foto untuk klien ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {allPhotos.map((p) => (
                <div key={p.id} className="group overflow-hidden border border-salon-sand/20 bg-salon-cream/10 p-2">
                  <img
                    src={p.file_path}
                    alt={p.caption ?? 'Foto treatment'}
                    className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="mt-2 text-[11px] text-salon-taupe space-y-0.5">
                    {p.caption && <p className="font-medium text-salon-charcoal truncate">{p.caption}</p>}
                    <p>
                      {new Date(p.uploaded_at).toLocaleDateString('id-ID')} · {p.booking.service_package}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Booking History */}
        <div className="bg-white border border-salon-sand/40 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-salon-sand/30 bg-salon-cream/10">
            <h2 className="font-serif text-2xl text-salon-charcoal">Riwayat Reservasi</h2>
            <p className="text-xs text-salon-taupe">{bookings.length} total reservasi</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-salon-sand/20 text-[10px] font-semibold tracking-salon text-salon-taupe bg-salon-cream/10">
                  <th className="p-6">TANGGAL & WAKTU</th>
                  <th className="p-6">PAKET TREATMENT</th>
                  <th className="p-6">ARTIST</th>
                  <th className="p-6">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-salon-sand/20">
                {bookings.map((b) => {
                  const status = b.status as BookingStatus
                  return (
                    <tr key={b.id} className="hover:bg-salon-cream/10 transition-colors">
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-salon-taupe" />
                          <span className="text-sm text-salon-charcoal">
                            {new Date(b.scheduled_at).toLocaleString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="p-6 text-sm text-salon-charcoal">{b.service_package}</td>
                      <td className="p-6 text-sm text-salon-charcoal">{b.artist?.name ?? '-'}</td>
                      <td className="p-6">
                        <span className={`text-[9px] tracking-salon font-semibold px-2.5 py-1 border rounded-none ${STATUS_COLORS[status]} uppercase`}>
                          {STATUS_LABELS[status]}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-salon-taupe text-sm">
                      Klien belum memiliki riwayat reservasi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  )
}
