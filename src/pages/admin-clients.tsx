import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Mail, Phone, CalendarClock, Users, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

import { api, type ClientWithCount } from '@/lib/api'

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientWithCount[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.clients
      .listForAdmin()
      .then(setClients)
      .catch((e) =>
        toast.error('Gagal memuat klien', {
          description: e instanceof Error ? e.message : undefined,
        }),
      )
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q),
    )
  }, [clients, query])

  return (
    <main className="min-h-screen bg-salon-cream pb-24">
      {/* ─── HEADER ─── */}
      <div className="bg-salon-charcoal text-salon-cream pt-24 pb-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('/hero-lash.png')] bg-cover bg-center mix-blend-overlay" />
        
        <div className="relative mx-auto max-w-5xl flex flex-col justify-between items-start gap-4 z-10">
          <Link
            to="/admin/dashboard"
            className="text-[10px] tracking-salon text-salon-cream/50 hover:text-salon-cream transition-colors uppercase flex items-center gap-1.5 mb-2"
          >
            <ArrowLeft className="h-3 w-3" /> DASHBOARD
          </Link>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight">
            Database Klien
          </h1>
          <p className="text-sm text-salon-cream/70 max-w-md leading-relaxed">
            Daftar pelanggan terdaftar, riwayat reservasi, dan data kontak lengkap.
          </p>
        </div>
      </div>

      {/* ─── SEARCH BAR ─── */}
      <div className="mx-auto max-w-5xl px-6 -mt-8 relative z-20">
        <div className="bg-white p-2 shadow-2xl flex items-center gap-2 max-w-md">
          <Search className="h-4 w-4 text-salon-taupe ml-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, email, atau HP..."
            className="w-full h-12 border-0 bg-transparent px-2 text-salon-charcoal placeholder-salon-taupe/40 focus:ring-0 focus:outline-none text-sm"
          />
        </div>
      </div>

      {/* ─── TABLE SECTION ─── */}
      <div className="mx-auto max-w-5xl px-6 mt-12 relative z-20 space-y-6">
        <div className="bg-white border border-salon-sand/40 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-salon-sand/20 text-[10px] font-semibold tracking-salon text-salon-taupe bg-salon-cream/10">
                  <th className="p-6">NAMA KLIEN</th>
                  <th className="p-6">KONTAK</th>
                  <th className="p-6">TOTAL BOOKING</th>
                  <th className="p-6">TANGGAL BERGABUNG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-salon-sand/20">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-16 text-center text-salon-taupe text-sm">
                      Memuat database pelanggan...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-16 text-center text-salon-taupe text-sm">
                      <Users className="mx-auto mb-4 h-10 w-10 text-salon-sand" />
                      <p className="font-serif text-lg text-salon-charcoal mb-1">Tidak ada klien ditemukan</p>
                      <p className="text-xs text-salon-taupe">
                        {query ? 'Tidak ada kecocokan hasil pencarian.' : 'Belum ada pelanggan terdaftar di sistem.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-salon-cream/10 transition-colors">
                      <td className="p-6">
                        <Link
                          to={`/clients/${c.id}`}
                          className="font-serif text-lg text-salon-charcoal hover:text-salon-brown hover:underline block"
                        >
                          {c.full_name}
                        </Link>
                      </td>
                      <td className="p-6 text-xs text-salon-taupe space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />
                          <span>{c.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{c.phone}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="text-xs font-semibold tracking-salon px-2.5 py-1 bg-salon-cream text-salon-charcoal border border-salon-sand/40 uppercase">
                          {c._count.bookings} booking
                        </span>
                      </td>
                      <td className="p-6 text-xs text-salon-taupe">
                        <div className="flex items-center gap-1.5">
                          <CalendarClock className="h-3.5 w-3.5" />
                          <span>
                            {new Date(c.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && (
          <p className="text-xs tracking-salon text-salon-taupe">
            MENAMPILKAN {filtered.length} DARI {clients.length} KLIEN
          </p>
        )}
      </div>
    </main>
  )
}
