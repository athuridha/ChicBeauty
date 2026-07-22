import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarCheck,
  Clock,
  TrendingDown,
  Crown,
  Download,
  Check,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import type { Booking, BookingStatus } from '@/shared/types'

interface Stats {
  bookings_today: number
  pending_deposits: number
  cancel_rate: number
  top_artist: { name: string; bookings: number } | null
}

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

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<number | null>(null)

  function loadData() {
    setLoading(true)
    Promise.all([
      api.admin.stats(),
      api.bookings.listForAdmin({
        status: statusFilter,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      }),
    ])
      .then(([s, b]) => {
        setStats(s)
        setBookings(b)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dateFrom, dateTo])

  async function handleConfirmDeposit(id: number) {
    setActingId(id)
    try {
      await api.admin.confirmDeposit(id)
      toast.success(`Deposit booking #${id} dikonfirmasi`)
      loadData()
    } catch (err) {
      toast.error('Gagal konfirmasi deposit', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setActingId(null)
    }
  }

  async function handleCancel(id: number) {
    if (!window.confirm(`Batalkan booking #${id}? Penalty berlaku jika melewati threshold.`))
      return
    setActingId(id)
    try {
      await api.admin.cancelBooking(id)
      toast.success(`Booking #${id} dibatalkan`)
      loadData()
    } catch (err) {
      toast.error('Gagal membatalkan booking', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setActingId(null)
    }
  }

  const hasFilter = dateFrom || dateTo || statusFilter !== 'all'

  return (
    <main className="min-h-screen bg-salon-cream pb-24">
      {/* ─── HEADER ─── */}
      <div className="bg-salon-charcoal text-salon-cream pt-24 pb-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('/hero-lash.png')] bg-cover bg-center mix-blend-overlay" />
        
        <div className="relative mx-auto max-w-[1400px] flex flex-col md:flex-row justify-between items-start md:items-end gap-6 z-10">
          <div className="space-y-2">
            <span className="text-[10px] tracking-salon text-salon-cream/50 uppercase block">RINGKASAN OPERASIONAL</span>
            <h1 className="font-serif text-4xl md:text-5xl tracking-tight">
              Dashboard Admin
            </h1>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <a 
              href={api.admin.exportCsvUrl()} 
              download
              className="flex items-center gap-2 border border-salon-sand/20 hover:border-salon-cream bg-white/5 hover:bg-white/10 text-salon-cream px-5 py-3 text-xs tracking-salon transition-all duration-300"
            >
              <Download className="h-4 w-4" />
              EXPORT CSV
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 md:px-10 -mt-8 relative z-20 space-y-8">
        
        {/* ─── STAT CARDS (BENTO) ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <BentoCard
            icon={<CalendarCheck className="h-5 w-5 text-emerald-700" />}
            label="BOOKING HARI INI"
            value={stats?.bookings_today?.toString() ?? '0'}
            loading={loading && !stats}
            tone="success"
          />
          <BentoCard
            icon={<Clock className="h-5 w-5 text-amber-700" />}
            label="PENDING DEPOSIT"
            value={stats?.pending_deposits?.toString() ?? '0'}
            loading={loading && !stats}
            tone="warning"
          />
          <BentoCard
            icon={<TrendingDown className="h-5 w-5 text-rose-700" />}
            label="CANCEL RATE"
            value={stats ? `${stats.cancel_rate}%` : '0%'}
            loading={loading && !stats}
            tone="danger"
          />
          <BentoCard
            icon={<Crown className="h-5 w-5 text-indigo-700" />}
            label="TOP ARTIST"
            value={stats?.top_artist?.name ?? '—'}
            hint={stats?.top_artist ? `${stats.top_artist.bookings} booking` : undefined}
            loading={loading && !stats}
            tone="primary"
          />
        </div>

        {/* ─── BOOKINGS TABLE SECTION ─── */}
        <div className="bg-white border border-salon-sand/40 shadow-xl overflow-hidden">
          
          {/* Filters Bar */}
          <div className="border-b border-salon-sand/30 bg-salon-cream/20 p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-1">
              <h2 className="font-serif text-2xl text-salon-charcoal">Daftar Transaksi</h2>
              <p className="text-xs text-salon-taupe">
                {loading ? 'Memuat data...' : `${bookings.length} booking ditemukan`}
              </p>
            </div>
            
            {/* Filter controls */}
            <div className="flex flex-wrap items-end gap-4 w-full lg:w-auto">
              <div className="flex flex-col gap-1.5 flex-1 sm:flex-initial">
                <span className="text-[10px] tracking-salon text-salon-taupe font-semibold uppercase">DARI</span>
                <input
                  type="date"
                  className="bg-transparent border-0 border-b border-salon-sand/60 px-0 py-1 focus:ring-0 focus:border-salon-charcoal text-sm text-salon-charcoal"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5 flex-1 sm:flex-initial">
                <span className="text-[10px] tracking-salon text-salon-taupe font-semibold uppercase">SAMPAI</span>
                <input
                  type="date"
                  className="bg-transparent border-0 border-b border-salon-sand/60 px-0 py-1 focus:ring-0 focus:border-salon-charcoal text-sm text-salon-charcoal"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5 flex-1 sm:flex-initial">
                <span className="text-[10px] tracking-salon text-salon-taupe font-semibold uppercase">STATUS</span>
                <select
                  className="bg-transparent border-0 border-b border-salon-sand/60 px-0 py-1 focus:ring-0 focus:border-salon-charcoal text-sm text-salon-charcoal appearance-none pr-6 cursor-pointer"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Semua Status</option>
                  {Object.entries(STATUS_LABELS).map(([s, l]) => (
                    <option key={s} value={s}>{l}</option>
                  ))}
                </select>
              </div>

              {hasFilter && (
                <button
                  onClick={() => {
                    setDateFrom('')
                    setDateTo('')
                    setStatusFilter('all')
                  }}
                  className="text-xs font-semibold tracking-salon text-red-600 hover:text-red-800 transition-colors uppercase h-8 self-end"
                >
                  RESET
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-salon-sand/20 text-[10px] font-semibold tracking-salon text-salon-taupe bg-salon-cream/10">
                  <th className="p-6">ID</th>
                  <th className="p-6">KLIEN</th>
                  <th className="p-6">LOKASI</th>
                  <th className="p-6">ARTIST</th>
                  <th className="p-6">JADWAL</th>
                  <th className="p-6">PAKET</th>
                  <th className="p-6">STATUS</th>
                  <th className="p-6 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-salon-sand/20">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-16 text-center text-salon-taupe text-sm">
                      Memuat data operasional...
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-16 text-center text-salon-taupe text-sm">
                      Tidak ada data booking yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => {
                    const status = b.status as BookingStatus
                    return (
                      <tr key={b.id} className="hover:bg-salon-cream/10 transition-colors group">
                        <td className="p-6 font-mono text-xs text-salon-taupe">#{b.id}</td>
                        <td className="p-6">
                          {b.client ? (
                            <Link 
                              to={`/clients/${b.client.id}`}
                              className="font-serif text-base text-salon-charcoal hover:text-salon-brown hover:underline block"
                            >
                              {b.client.full_name}
                            </Link>
                          ) : '-'}
                          {b.client && (
                            <span className="block text-xs text-salon-taupe mt-0.5">{b.client.phone}</span>
                          )}
                        </td>
                        <td className="p-6">
                          <span className="text-xs font-medium text-salon-charcoal">
                            {b.location_type === 'home_service' ? 'Home Service' : 'Studio'}
                          </span>
                          {b.location_type === 'home_service' && b.address && (
                            <span className="block text-[11px] text-salon-taupe truncate max-w-[150px] mt-0.5" title={b.address}>
                              {b.address}
                            </span>
                          )}
                        </td>
                        <td className="p-6 text-sm text-salon-charcoal">{b.artist?.name ?? '-'}</td>
                        <td className="p-6">
                          <span className="text-sm text-salon-charcoal block">
                            {new Date(b.scheduled_at).toLocaleDateString('id-ID', {
                              day: 'numeric', month: 'short'
                            })}
                          </span>
                          <span className="text-xs text-salon-taupe block mt-0.5">
                            {(() => {
                              const d = new Date(b.scheduled_at)
                              return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`
                            })()}
                          </span>
                        </td>
                        <td className="p-6 text-sm text-salon-charcoal">{b.service_package}</td>
                        <td className="p-6">
                          <span className={`text-[9px] tracking-salon font-semibold px-2.5 py-1 border rounded-none ${STATUS_COLORS[status]} uppercase`}>
                            {STATUS_LABELS[status]}
                          </span>
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {status === 'pending_deposit' && (
                              <button
                                disabled={actingId === b.id}
                                onClick={() => handleConfirmDeposit(b.id)}
                                className="bg-emerald-700 text-salon-cream hover:bg-emerald-800 text-[10px] font-semibold tracking-salon px-3 py-2 transition-colors flex items-center gap-1"
                                title="Konfirmasi Deposit"
                              >
                                <Check className="h-3 w-3" />
                                DEPOSIT
                              </button>
                            )}
                            
                            {status !== 'completed' && !status.startsWith('cancelled') && (
                              <button
                                disabled={actingId === b.id}
                                onClick={() => handleCancel(b.id)}
                                className="bg-transparent border border-red-200 text-red-600 hover:bg-red-50 text-[10px] font-semibold tracking-salon px-3 py-2 transition-colors flex items-center gap-1"
                                title="Batalkan Booking"
                              >
                                <X className="h-3 w-3" />
                                BATAL
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </main>
  )
}

function BentoCard({
  icon,
  label,
  value,
  hint,
  loading,
  tone
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
  loading: boolean
  tone: 'default' | 'success' | 'warning' | 'danger' | 'primary'
}) {
  const toneClasses = {
    default: 'border border-salon-sand/40 border-l-4 border-l-salon-charcoal',
    success: 'border border-salon-sand/40 border-l-4 border-l-emerald-600',
    warning: 'border border-salon-sand/40 border-l-4 border-l-amber-500',
    danger: 'border border-salon-sand/40 border-l-4 border-l-rose-600',
    primary: 'border border-salon-sand/40 border-l-4 border-l-indigo-600'
  }[tone]

  return (
    <div className={`p-6 shadow-sm flex flex-col justify-between min-h-[140px] bg-white transition-all duration-300 hover:shadow-md ${toneClasses}`}>
      <div className="flex justify-between items-start">
        <span className="text-[10px] tracking-salon font-bold text-salon-taupe">{label}</span>
        <div className="p-2 bg-salon-cream/50 rounded-sm">
          {icon}
        </div>
      </div>
      <div className="mt-4">
        {loading ? (
          <span className="text-lg text-salon-sand animate-pulse font-medium">Loading...</span>
        ) : (
          <p className="font-mono text-3xl font-bold tracking-tight text-salon-charcoal leading-none">
            {value}
          </p>
        )}
        {hint && <p className="text-xs text-salon-taupe mt-1.5">{hint}</p>}
      </div>
    </div>
  )
}
