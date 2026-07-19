import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventDropArg } from '@fullcalendar/core'
import type { EventInput } from '@fullcalendar/core'
import { Calendar, Search, Upload, Check, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import PhotoUploadPanel from '@/components/photo-upload-panel'
import type { Artist, Booking, BookingStatus, Client } from '@/shared/types'

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending_deposit: '#b45309', // Amber-700
  confirmed: '#047857',      // Emerald-700
  checked_in: '#0369a1',     // Sky-700
  completed: '#1e293b',      // Slate-800
  cancelled: '#64748b',      // Slate-500
  cancelled_penalty_applied: '#be123c', // Rose-700
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending_deposit: 'Pending Deposit',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  completed: 'Completed',
  cancelled: 'Cancelled',
  cancelled_penalty_applied: 'Cancelled + Penalty',
}

const STATUS_BADGES: Record<BookingStatus, string> = {
  pending_deposit: 'bg-amber-50 text-amber-700 border-amber-200/50',
  confirmed: 'bg-green-50 text-green-700 border-green-200/50',
  checked_in: 'bg-sky-50 text-sky-700 border-sky-200/50',
  completed: 'bg-slate-50 text-slate-700 border-slate-200/50',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200/50',
  cancelled_penalty_applied: 'bg-red-50 text-red-700 border-red-200/50',
}

function durationMin(pkg: string): number {
  if (/mega/i.test(pkg)) return 120
  if (/volume/i.test(pkg)) return 90
  return 60
}

function bookingToEvent(b: Booking): EventInput {
  const start = new Date(b.scheduled_at)
  const end = new Date(start.getTime() + durationMin(b.service_package) * 60000)
  const status = b.status as BookingStatus
  return {
    id: String(b.id),
    title: `${b.client?.full_name ?? 'Klien'} · ${b.service_package}`,
    start: start.toISOString(),
    end: end.toISOString(),
    backgroundColor: STATUS_COLORS[status] ?? '#64748b',
    borderColor: STATUS_COLORS[status] ?? '#64748b',
    textColor: '#ffffff',
    extendedProps: { booking: b },
  }
}

export default function ArtistDashboardPage() {
  const calRef = useRef<FullCalendar>(null)
  const [artists, setArtists] = useState<Artist[]>([])
  const [artistId, setArtistId] = useState<number | null>(null)
  const [events, setEvents] = useState<EventInput[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showPhotoPanel, setShowPhotoPanel] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Client[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: number; role: string; name: string } | null>(null)

  useEffect(() => {
    Promise.all([
      api.artists.list().catch(() => []),
      api.auth.me().catch(() => null)
    ]).then(([artistList, user]) => {
      setArtists(artistList)
      if (user) {
        setCurrentUser(user)
        if (user.role === 'artist') {
          setArtistId(user.id)
        }
      }
    })
  }, [])

  const fetchEvents = useCallback(async () => {
    if (!artistId || !calRef.current) return
    const cal = calRef.current.getApi()
    setLoading(true)
    try {
      const bookings = await api.bookings.listByArtistRange(
        artistId,
        cal.view.activeStart,
        cal.view.activeEnd,
      )
      setEvents(bookings.map(bookingToEvent))
    } catch (e) {
      toast.error('Gagal memuat booking', {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setLoading(false)
    }
  }, [artistId])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    if (!artistId) return
    const t = setInterval(fetchEvents, 30_000)
    return () => clearInterval(t)
  }, [artistId, fetchEvents])

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      setSearchOpen(false)
      return
    }
    const t = setTimeout(() => {
      api.clients
        .search(searchQuery)
        .then((r) => {
          setSearchResults(r)
          setSearchOpen(true)
        })
        .catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [searchQuery])

  async function handleEventDrop(info: EventDropArg) {
    const b = info.event.extendedProps.booking as Booking
    const newStart = info.event.start
    if (!newStart) return
    try {
      const updated = await api.bookings.reschedule(b.id, newStart.toISOString())
      setEvents((prev) =>
        prev.map((e) => (e.id === String(updated.id) ? bookingToEvent(updated) : e)),
      )
      setSelectedBooking(updated)
      toast.success('Reschedule berhasil', {
        description: new Date(updated.scheduled_at).toLocaleString('id-ID'),
      })
    } catch (e) {
      info.revert()
      toast.error('Gagal reschedule', {
        description: e instanceof Error ? e.message : undefined,
      })
    }
  }

  async function handleCheckIn() {
    if (!selectedBooking) return
    try {
      const updated = await api.bookings.checkIn(selectedBooking.id)
      setEvents((prev) =>
        prev.map((e) => (e.id === String(updated.id) ? bookingToEvent(updated) : e)),
      )
      setSelectedBooking(updated)
      toast.success('Klien check-in berhasil')
    } catch (e) {
      toast.error('Gagal check-in', {
        description: e instanceof Error ? e.message : undefined,
      })
    }
  }

  async function handleComplete() {
    if (!selectedBooking) return
    try {
      const updated = await api.bookings.complete(selectedBooking.id)
      setEvents((prev) =>
        prev.map((e) => (e.id === String(updated.id) ? bookingToEvent(updated) : e)),
      )
      setSelectedBooking(updated)
      toast.success('Treatment selesai')
    } catch (e) {
      toast.error('Gagal update', {
        description: e instanceof Error ? e.message : undefined,
      })
    }
  }

  const status = selectedBooking?.status as BookingStatus | undefined

  return (
    <main className="min-h-screen bg-salon-cream pb-24">
      {/* ─── HEADER ─── */}
      <div className="bg-salon-charcoal text-salon-cream pt-24 pb-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('/hero-lash.png')] bg-cover bg-center mix-blend-overlay" />
        
        <div className="relative mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-start md:items-end gap-6 z-10">
          <div className="space-y-1.5">
            <span className="text-[10px] tracking-salon text-salon-cream/50 uppercase block">PANEL KERJA ARTIST</span>
            <h1 className="font-serif text-4xl md:text-5xl tracking-tight">
              {currentUser?.role === 'artist' ? `Kalender ${currentUser.name}` : 'Kalender Kerja Artist'}
            </h1>
            <p className="text-sm text-salon-cream/70 leading-relaxed">
              Pemantauan reservasi real-time. Geser jadwal untuk reschedule, klik untuk mengubah status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Klien */}
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-salon-cream/40" />
              <input
                type="text"
                placeholder="Cari klien..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                className="w-full md:w-56 h-11 border border-white/20 bg-white/5 pl-10 pr-4 text-xs text-salon-cream placeholder-salon-cream/40 focus:ring-0 focus:border-white transition-colors"
              />
              {searchOpen && searchResults.length > 0 && (
                <ul className="absolute z-50 mt-1 max-h-60 w-72 overflow-auto bg-white border border-salon-sand/40 shadow-2xl py-1 text-xs">
                  {searchResults.map((c) => (
                    <li
                      key={c.id}
                      className="cursor-pointer px-4 py-3 hover:bg-salon-cream/30 transition-colors flex flex-col gap-0.5 border-b border-salon-sand/10 last:border-0"
                      onMouseDown={() => {
                        window.location.href = `/clients/${c.id}`
                      }}
                    >
                      <div className="font-semibold text-salon-charcoal">{c.full_name}</div>
                      <div className="text-[10px] text-salon-taupe">
                        {c.email} · {c.phone}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Dropdown Select Artist (Admin Only) */}
            {currentUser?.role === 'admin' && (
              <select
                className="h-11 border border-white/20 bg-white/5 px-4 text-xs text-salon-cream focus:ring-0 focus:border-white transition-colors cursor-pointer"
                value={artistId ?? ''}
                onChange={(e) => setArtistId(Number(e.target.value) || null)}
              >
                <option value="" className="text-salon-charcoal">Pilih artist...</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id} className="text-salon-charcoal">
                    {a.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* ─── STATUS LEGEND ─── */}
      <div className="mx-auto max-w-6xl px-6 md:px-10 mt-8">
        <div className="bg-white border border-salon-sand/40 p-4 flex flex-wrap gap-x-6 gap-y-2 justify-center md:justify-start">
          {Object.entries(STATUS_COLORS).map(([statusKey, color]) => (
            <div key={statusKey} className="flex items-center gap-2 text-[10px] tracking-salon font-semibold text-salon-taupe uppercase">
              <span
                className="inline-block h-3.5 w-3.5"
                style={{ backgroundColor: color }}
              />
              {STATUS_LABELS[statusKey as BookingStatus]}
            </div>
          ))}
        </div>
      </div>

      {/* ─── MAIN CALENDAR SECTION ─── */}
      <div className="mx-auto max-w-6xl px-6 md:px-10 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Calendar Area */}
        <div className="lg:col-span-2 space-y-6">
          {!artistId ? (
            <div className="border border-dashed border-salon-sand/60 py-24 text-center bg-white shadow-xl">
              <Calendar className="mx-auto h-12 w-12 text-salon-sand mb-4 animate-pulse" />
              <h3 className="font-serif text-2xl text-salon-charcoal mb-2">Pilih Artist</h3>
              <p className="text-sm text-salon-taupe max-w-xs mx-auto">
                Silakan pilih artist dari menu dropdown di atas untuk memantau kalender reservasinya.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-salon-sand/40 p-6 md:p-8 shadow-xl relative">
              {loading && (
                <div className="absolute inset-0 bg-white/60 z-30 flex items-center justify-center text-xs tracking-salon text-salon-taupe font-semibold">
                  SINKRONISASI JADWAL...
                </div>
              )}
              <div className="salon-calendar-wrapper">
                <FullCalendar
                  ref={calRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="timeGridDay"
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'timeGridDay,timeGridWeek',
                  }}
                  height="auto"
                  slotMinTime="08:00:00"
                  slotMaxTime="20:00:00"
                  slotDuration="00:30:00"
                  slotLabelInterval="01:00:00"
                  nowIndicator
                  editable
                  eventDurationEditable={false}
                  eventStartEditable
                  selectable={false}
                  events={events}
                  datesSet={fetchEvents}
                  eventClick={(info) => {
                    const b = info.event.extendedProps.booking as Booking
                    setSelectedBooking(b)
                  }}
                  eventDrop={handleEventDrop}
                  eventTimeFormat={{
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  }}
                  dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Selected Booking Panel (Side Drawer Style) */}
        <div className="space-y-6">
          {selectedBooking && status ? (
            <div className="bg-white border border-salon-sand/40 p-6 md:p-8 shadow-xl space-y-6 animate-in fade-in duration-300 relative">
              <button 
                onClick={() => setSelectedBooking(null)}
                className="absolute top-6 right-6 text-salon-taupe hover:text-salon-charcoal transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="space-y-4">
                <div className="space-y-1">
                  <span className={`text-[9px] tracking-salon font-semibold px-2 py-0.5 border ${STATUS_BADGES[status]} uppercase inline-block`}>
                    {STATUS_LABELS[status]}
                  </span>
                  <p className="text-[10px] font-mono tracking-salon text-salon-taupe mt-2">BOOKING ID: #{selectedBooking.id}</p>
                  <Link
                    to={`/clients/${selectedBooking.client?.id}`}
                    className="font-serif text-2xl text-salon-charcoal hover:text-salon-brown hover:underline block leading-tight"
                  >
                    {selectedBooking.client?.full_name ?? 'Klien'}
                  </Link>
                  <p className="text-xs text-salon-taupe">{selectedBooking.service_package}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-salon-sand/20 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 leading-relaxed">
                  <div>
                    <span className="text-[10px] font-semibold tracking-salon text-salon-taupe block">JADWAL TREATMENT</span>
                    <span className="text-salon-charcoal font-medium">
                      {new Date(selectedBooking.scheduled_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold tracking-salon text-salon-taupe block">LOKASI LAYANAN</span>
                    <span className="text-salon-charcoal font-medium capitalize">
                      {selectedBooking.location_type === 'home_service' ? 'Home Service' : 'Studio'}
                    </span>
                  </div>
                </div>

                {selectedBooking.location_type === 'home_service' && selectedBooking.address && (
                  <div>
                    <span className="text-[10px] font-semibold tracking-salon text-salon-taupe block">ALAMAT DETAIL</span>
                    <span className="text-salon-charcoal italic block">{selectedBooking.address}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 leading-relaxed">
                  <div>
                    <span className="text-[10px] font-semibold tracking-salon text-salon-taupe block">EMAIL KLIEN</span>
                    <span className="text-salon-charcoal truncate block">{selectedBooking.client?.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold tracking-salon text-salon-taupe block">NO. HP KLIEN</span>
                    <span className="text-salon-charcoal block">{selectedBooking.client?.phone}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-salon-sand/20 space-y-3">
                {status === 'confirmed' && (
                  <button
                    onClick={handleCheckIn}
                    className="w-full flex items-center justify-center gap-2 bg-salon-charcoal text-salon-cream hover:bg-salon-brown py-3.5 text-xs tracking-salon transition-colors font-semibold"
                  >
                    <Check className="h-4 w-4" />
                    CHECK-IN KLIEN
                  </button>
                )}
                {status === 'checked_in' && (
                  <button
                    onClick={handleComplete}
                    className="w-full flex items-center justify-center gap-2 bg-salon-charcoal text-salon-cream hover:bg-salon-brown py-3.5 text-xs tracking-salon transition-colors font-semibold"
                  >
                    <Sparkles className="h-4 w-4" />
                    TANDAI SELESAI
                  </button>
                )}
                {['confirmed', 'checked_in', 'completed'].includes(status) && (
                  <button
                    onClick={() => setShowPhotoPanel(true)}
                    className="w-full flex items-center justify-center gap-2 bg-transparent border border-salon-sand text-salon-charcoal hover:bg-salon-sand/10 py-3.5 text-xs tracking-salon transition-colors font-semibold"
                  >
                    <Upload className="h-4 w-4" />
                    UNGGAH FOTO BEFORE/AFTER
                  </button>
                )}

                {status === 'pending_deposit' && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200/50 p-3 leading-relaxed">
                    Reservasi ini masih menunggu verifikasi uang muka (deposit) dari pihak pelanggan.
                  </p>
                )}
                {(status === 'cancelled' || status === 'cancelled_penalty_applied') && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200/50 p-3 leading-relaxed">
                    Jadwal treatment ini telah dibatalkan.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-salon-sand/40 border-l-4 border-l-salon-charcoal p-6 md:p-8 text-center text-salon-taupe text-xs">
              Pilih salah satu jadwal di kalender untuk menampilkan detail reservasi dan aksi status.
            </div>
          )}
        </div>

      </div>

      {showPhotoPanel && selectedBooking && (
        <PhotoUploadPanel
          booking={selectedBooking}
          onClose={() => setShowPhotoPanel(false)}
        />
      )}
    </main>
  )
}
