import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowRight, Check, MapPin } from 'lucide-react'
import { toast } from 'sonner'

import { api, type Slot } from '@/lib/api'
import type { Artist, BusinessRules, ServicePackage } from '@/shared/types'

type Step = 'info' | 'slot' | 'confirm' | 'success'

export default function BookingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('info')
  const [artists, setArtists] = useState<Artist[]>([])
  const [rules, setRules] = useState<BusinessRules | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [locationType, setLocationType] = useState<'studio' | 'home_service'>('home_service')
  const [address, setAddress] = useState('')
  const [artistId, setArtistId] = useState<number | null>(null)
  const [packages, setPackages] = useState<ServicePackage[]>([])
  const [packageId, setPackageId] = useState('')
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [creating, setCreating] = useState(false)
  const [bookingId, setBookingId] = useState<number | null>(null)

  useEffect(() => {
    api.artists.list().then(setArtists).catch(() => {})

    api.admin.rules
      .get()
      .then((r) => {
        setRules(r)
        if (r.allow_home_service === false && r.allow_studio !== false) {
          setLocationType('studio')
        } else if (r.allow_studio === false && r.allow_home_service !== false) {
          setLocationType('home_service')
        }
      })
      .catch(() => {})
    
    // Fetch dynamic packages
    api.services.list()
      .then((res) => {
        setPackages(res)
        if (res.length > 0) {
          setPackageId(res[0].id)
        }
      })
      .catch(() => {})
  }, [])

  // Fetch slots when artist + date + package + locationType change
  useEffect(() => {
    if (!artistId || !date || !packageId) {
      setSlots([])
      setSelectedSlot(null)
      return
    }
    setLoadingSlots(true)
    api.bookings
      .slots(artistId, date, packageId, locationType)
      .then((res) => {
        setSlots(res.slots)
        setSelectedSlot(null)
      })
      .catch((e) => toast.error('Gagal memuat slot', { description: e.message }))
      .finally(() => setLoadingSlots(false))
  }, [artistId, date, packageId, locationType])

  // Auto reset artistId if selected artist does not support locationType
  useEffect(() => {
    if (artistId && artists.length > 0) {
      const artist = artists.find((a) => a.id === artistId)
      if (artist) {
        if (locationType === 'studio' && artist.allows_studio === false) {
          setArtistId(null)
          toast.info(`Artist ${artist.name} tidak melayani reservasi di studio.`)
        } else if (locationType === 'home_service' && artist.allows_home_service === false) {
          setArtistId(null)
          toast.info(`Artist ${artist.name} tidak melayani reservasi home service.`)
        }
      }
    }
  }, [locationType, artistId, artists])
  const today = new Date().toISOString().slice(0, 10)
  const pkg = packages.find((p) => p.id === packageId) ?? { id: '', name: 'Loading...', duration_minutes: 0, price: 0 }

  async function handleConfirm() {
    if (!artistId || !selectedSlot) return
    setCreating(true)
    try {
      const booking = await api.bookings.create({
        client: { full_name: fullName, email, phone },
        artist_id: artistId,
        scheduled_at: selectedSlot.start,
        service_package: pkg.name,
        location_type: locationType,
        address: locationType === 'home_service' ? address : undefined,
      })
      setBookingId(booking.id)
      setStep('success')
      toast.success('Booking berhasil!')
    } catch (e) {
      toast.error('Gagal booking', {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setCreating(false)
    }
  }

  function reset() {
    setStep('info')
    setFullName('')
    setEmail('')
    setPhone('')
    setLocationType('home_service')
    setAddress('')
    setArtistId(null)
    setSelectedSlot(null)
    setDate('')
    setSlots([])
    setBookingId(null)
  }

  if (step === 'success' && bookingId) {
    return (
      <main className="min-h-screen bg-salon-cream pt-32 pb-24 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white p-8 md:p-10 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-green-700 bg-green-50 mb-6">
            <Check className="h-8 w-8 text-green-700" />
          </div>
          <h1 className="font-serif text-3xl text-salon-charcoal mb-2">Booking Berhasil</h1>
          <p className="text-salon-taupe mb-6">ID Booking Anda:</p>
          <p className="font-mono text-4xl font-bold tracking-tight text-salon-charcoal mb-8">
            #{bookingId}
          </p>
          
          <div className="flex justify-center bg-salon-cream/50 p-6 w-full mb-8">
            <QRCodeSVG
              value={`${window.location.origin}/booking/${bookingId}`}
              size={180}
            />
          </div>

          <div className="space-y-2 text-sm text-salon-taupe mb-10">
            <p>Simpan ID ini atau scan QR untuk akses halaman booking Anda.</p>
            <p className="font-medium text-salon-charcoal">
              Silakan upload bukti deposit dalam 2 jam.
            </p>
            <p>Jika tidak, booking otomatis dibatalkan.</p>
          </div>

          <div className="flex flex-col w-full gap-3">
            <button 
              onClick={() => navigate(`/booking/${bookingId}`)}
              className="w-full bg-salon-charcoal text-salon-cream hover:bg-salon-brown py-4 text-xs tracking-salon transition-colors"
            >
              UPLOAD DEPOSIT SEKARANG
            </button>
            <button 
              onClick={reset}
              className="w-full bg-transparent border border-salon-sand/50 text-salon-charcoal hover:bg-salon-sand/10 py-4 text-xs tracking-salon transition-colors"
            >
              BOOKING LAGI
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-salon-cream pb-24">
      {/* ─── HEADER ─── */}
      <div className="bg-salon-charcoal text-salon-cream pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('/hero-lash.png')] bg-cover bg-center mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-salon-charcoal/50 to-salon-charcoal" />
        
        <div className="relative mx-auto max-w-3xl text-center z-10">
          <span className="text-[10px] tracking-salon text-salon-cream/60 uppercase block mb-3">RESERVASI JADWAL</span>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight mb-4">
            Book Your Treatment
          </h1>
          <p className="text-sm text-salon-cream/70 max-w-md mx-auto leading-relaxed">
            Layanan home service premium langsung di rumah Anda, atau kunjungi studio kami untuk kenyamanan maksimal.
          </p>
        </div>
      </div>

      {/* ─── CONTENT CONTAINER ─── */}
      <div className="mx-auto max-w-2xl px-6 -mt-8 relative z-20">
        <div className="bg-white p-8 md:p-12 shadow-2xl">
          
          {/* Progress Steps */}
          <div className="mb-12 flex items-center justify-between max-w-md mx-auto">
            <StepNumber num="01" label="Data" active={step === 'info'} done={step !== 'info'} />
            <StepLine done={step !== 'info'} />
            <StepNumber num="02" label="Jadwal" active={step === 'slot'} done={step === 'confirm'} />
            <StepLine done={step === 'confirm'} />
            <StepNumber num="03" label="Konfirmasi" active={step === 'confirm'} done={false} />
          </div>

          {/* ─── STEP 1: INFO ─── */}
          {step === 'info' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="font-serif text-2xl text-salon-charcoal mb-2">Data Diri</h2>
              <p className="text-salon-taupe text-xs mb-8">Lengkapi data Anda untuk keperluan reservasi.</p>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold tracking-salon text-salon-charcoal">NAMA LENGKAP</label>
                  <input
                    type="text"
                    className="w-full border-0 border-b border-salon-sand bg-transparent px-0 py-2 text-salon-charcoal placeholder-salon-taupe/40 focus:ring-0 focus:border-salon-charcoal transition-colors text-sm"
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold tracking-salon text-salon-charcoal">EMAIL</label>
                    <input
                      type="email"
                      className="w-full border-0 border-b border-salon-sand bg-transparent px-0 py-2 text-salon-charcoal placeholder-salon-taupe/40 focus:ring-0 focus:border-salon-charcoal transition-colors text-sm"
                      placeholder="jane@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold tracking-salon text-salon-charcoal">NO. HANDPHONE</label>
                    <input
                      type="tel"
                      className="w-full border-0 border-b border-salon-sand bg-transparent px-0 py-2 text-salon-charcoal placeholder-salon-taupe/40 focus:ring-0 focus:border-salon-charcoal transition-colors text-sm"
                      placeholder="0812..."
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <label className="text-[10px] font-semibold tracking-salon text-salon-charcoal">PILIH LOKASI TREATMENT</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      disabled={rules?.allow_home_service === false}
                      onClick={() => setLocationType('home_service')}
                      className={`flex flex-col items-center justify-center border py-4 transition-all duration-300 ${
                        locationType === 'home_service'
                          ? 'border-salon-charcoal bg-salon-charcoal text-salon-cream'
                          : 'border-salon-sand bg-transparent text-salon-charcoal hover:border-salon-charcoal'
                      } ${rules?.allow_home_service === false ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <MapPin className="mb-1 h-4 w-4" />
                      <span className="text-[10px] tracking-salon">HOME SERVICE</span>
                      {rules?.allow_home_service === false && (
                        <span className="text-[9px] text-red-400 font-sans mt-0.5">(TIDAK TERSEDIA)</span>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={rules?.allow_studio === false}
                      onClick={() => setLocationType('studio')}
                      className={`flex flex-col items-center justify-center border py-4 transition-all duration-300 ${
                        locationType === 'studio'
                          ? 'border-salon-charcoal bg-salon-charcoal text-salon-cream'
                          : 'border-salon-sand bg-transparent text-salon-charcoal hover:border-salon-charcoal'
                      } ${rules?.allow_studio === false ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <MapPin className="mb-1 h-4 w-4" />
                      <span className="text-[10px] tracking-salon">DI STUDIO</span>
                      {rules?.allow_studio === false && (
                        <span className="text-[9px] text-red-400 font-sans mt-0.5">(TIDAK TERSEDIA)</span>
                      )}
                    </button>
                  </div>
                </div>

                {locationType === 'home_service' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-semibold tracking-salon text-salon-charcoal">ALAMAT LENGKAP</label>
                    <textarea
                      className="w-full min-h-[80px] border-0 border-b border-salon-sand bg-transparent px-0 py-2 text-salon-charcoal placeholder-salon-taupe/40 focus:ring-0 focus:border-salon-charcoal transition-colors resize-none text-sm leading-relaxed"
                      placeholder="Nama jalan, RT/RW, Patokan..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                )}

                <div className="pt-6">
                  <button
                    disabled={!fullName || !email || !phone || (locationType === 'home_service' && !address)}
                    onClick={() => setStep('slot')}
                    className="w-full bg-salon-charcoal text-salon-cream hover:bg-salon-brown py-4 text-xs tracking-salon transition-colors disabled:opacity-50 flex items-center justify-center group"
                  >
                    LANJUTKAN
                    <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 2: SLOT ─── */}
          {step === 'slot' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="font-serif text-2xl text-salon-charcoal mb-2">Pilih Jadwal</h2>
              <p className="text-salon-taupe text-xs mb-8">Tentukan artist, paket, dan waktu treatment Anda.</p>
              
              <div className="space-y-6">
                {/* Location selector toggle in Step 2 */}
                <div className="space-y-2 pb-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-semibold tracking-salon text-salon-charcoal uppercase">LOKASI TREATMENT</label>
                    <span className="text-[10px] font-medium text-salon-taupe">
                      {locationType === 'home_service' ? 'Home Service (Kunjungan Rumah)' : 'Di Studio'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={rules?.allow_home_service === false}
                      onClick={() => setLocationType('home_service')}
                      className={`flex items-center justify-center gap-2 border py-2.5 transition-all duration-300 ${
                        locationType === 'home_service'
                          ? 'border-salon-charcoal bg-salon-charcoal text-salon-cream'
                          : 'border-salon-sand bg-transparent text-salon-charcoal hover:border-salon-charcoal'
                      } ${rules?.allow_home_service === false ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="text-[10px] tracking-salon font-semibold uppercase">HOME SERVICE</span>
                    </button>
                    <button
                      type="button"
                      disabled={rules?.allow_studio === false}
                      onClick={() => setLocationType('studio')}
                      className={`flex items-center justify-center gap-2 border py-2.5 transition-all duration-300 ${
                        locationType === 'studio'
                          ? 'border-salon-charcoal bg-salon-charcoal text-salon-cream'
                          : 'border-salon-sand bg-transparent text-salon-charcoal hover:border-salon-charcoal'
                      } ${rules?.allow_studio === false ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="text-[10px] tracking-salon font-semibold uppercase">DI STUDIO</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold tracking-salon text-salon-charcoal uppercase">ARTIST</label>
                    <div className="relative">
                      <select
                        className="w-full border-0 border-b border-salon-sand bg-transparent px-0 py-2 text-salon-charcoal focus:ring-0 focus:border-salon-charcoal transition-colors appearance-none text-sm"
                        value={artistId ?? ''}
                        onChange={(e) => setArtistId(Number(e.target.value) || null)}
                      >
                        <option value="">Pilih Artist...</option>
                        {artists
                          .filter((a) => {
                            if (locationType === 'studio') return a.allows_studio !== false
                            if (locationType === 'home_service') return a.allows_home_service !== false
                            return true
                          })
                          .map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold tracking-salon text-salon-charcoal uppercase">PAKET</label>
                    <div className="relative">
                      <select
                        className="w-full border-0 border-b border-salon-sand bg-transparent px-0 py-2 text-salon-charcoal focus:ring-0 focus:border-salon-charcoal transition-colors appearance-none text-sm"
                        value={packageId}
                        onChange={(e) => setPackageId(e.target.value)}
                      >
                        {packages.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} · {p.duration_minutes}m
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-semibold tracking-salon text-salon-charcoal uppercase">TANGGAL</label>
                  <input
                    type="date"
                    min={today}
                    className="w-full border-0 border-b border-salon-sand bg-transparent px-0 py-2 text-salon-charcoal focus:ring-0 focus:border-salon-charcoal transition-colors text-sm"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                {/* Slot grid */}
                <div className="pt-2">
                  <label className="text-[10px] font-bold tracking-salon text-salon-charcoal uppercase block mb-4">WAKTU TERSEDIA</label>
                  {!artistId || !date ? (
                    <div className="py-8 text-center border border-dashed border-salon-sand text-salon-taupe text-xs">
                      Pilih artist & tanggal untuk melihat slot.
                    </div>
                  ) : loadingSlots ? (
                    <div className="py-8 text-center border border-dashed border-salon-sand text-salon-taupe text-xs">
                      Mencari slot...
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-salon-sand text-salon-taupe text-xs">
                      Tidak ada slot tersedia untuk tanggal dan lokasi ini.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {slots.map((s) => {
                        const d = new Date(s.start)
                        const hours = String(d.getHours()).padStart(2, '0')
                        const minutes = String(d.getMinutes()).padStart(2, '0')
                        const time = `${hours}.${minutes}`
                        const selected = selectedSlot?.start === s.start
                        return (
                          <button
                            key={s.start}
                            disabled={!s.available}
                            onClick={() => setSelectedSlot(s)}
                            className={`py-3 px-4 text-sm font-medium transition-all duration-300 border text-center ${
                              selected
                                ? 'bg-salon-charcoal border-salon-charcoal text-salon-cream shadow-md scale-[1.02]'
                                : s.available
                                  ? 'border-salon-sand/80 bg-white text-salon-charcoal hover:border-salon-charcoal hover:shadow-sm'
                                  : 'border-salon-sand/30 bg-gray-50/50 text-salon-sand/40 cursor-not-allowed line-through'
                            }`}
                          >
                            {time}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-6 flex gap-4">
                  <button
                    onClick={() => setStep('info')}
                    className="flex-1 bg-transparent border border-salon-sand text-salon-charcoal hover:bg-salon-sand/10 py-4 text-xs tracking-salon transition-colors"
                  >
                    KEMBALI
                  </button>
                  <button
                    disabled={!selectedSlot}
                    onClick={() => setStep('confirm')}
                    className="flex-[2] bg-salon-charcoal text-salon-cream hover:bg-salon-brown py-4 text-xs tracking-salon transition-colors disabled:opacity-50"
                  >
                    LANJUT KONFIRMASI
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 3: CONFIRM ─── */}
          {step === 'confirm' && selectedSlot && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="font-serif text-2xl text-salon-charcoal mb-2">Konfirmasi</h2>
              <p className="text-salon-taupe text-xs mb-8">Tinjau kembali detail booking Anda sebelum diproses.</p>
              
              <div className="border border-salon-sand/50 p-6 md:p-8 space-y-4 bg-salon-cream/20 mb-8">
                <Row label="NAMA" value={fullName} />
                <Row label="LOKASI" value={locationType === 'home_service' ? 'Home Service' : 'Studio'} />
                {locationType === 'home_service' && (
                  <Row label="ALAMAT" value={address} />
                )}
                
                <hr className="border-salon-sand/30" />
                
                <Row 
                  label="TANGGAL" 
                  value={new Date(selectedSlot.start).toLocaleDateString('id-ID', {
                    weekday: 'long', day: 'numeric', month: 'long'
                  })} 
                />
                <Row 
                  label="WAKTU" 
                  value={(() => {
                    const d = new Date(selectedSlot.start)
                    return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`
                  })()} 
                />
                <Row label="ARTIST" value={artists.find((a) => a.id === artistId)?.name ?? '-'} />
                
                <hr className="border-salon-sand/30" />
                
                <Row label="PAKET" value={`${pkg.name}`} />
                <Row label="TOTAL HARGA" value={`Rp${pkg.price.toLocaleString('id-ID')}`} />
                <div className="flex justify-between items-end pt-4 border-t border-salon-charcoal">
                  <span className="text-[10px] tracking-salon text-salon-charcoal font-semibold">DEPOSIT DIBAYAR (50%)</span>
                  <span className="font-serif text-xl md:text-2xl text-salon-charcoal">
                    Rp{Math.round(pkg.price * 0.5).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep('slot')}
                  className="w-1/3 bg-transparent border border-salon-sand text-salon-charcoal hover:bg-salon-sand/10 py-4 text-xs tracking-salon transition-colors"
                >
                  KEMBALI
                </button>
                <button
                  disabled={creating}
                  onClick={handleConfirm}
                  className="w-2/3 bg-salon-charcoal text-salon-cream hover:bg-salon-brown py-4 text-xs tracking-salon transition-colors disabled:opacity-50"
                >
                  {creating ? 'MEMPROSES...' : 'KONFIRMASI BOOKING'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="tracking-salon text-salon-taupe shrink-0">{label}</span>
      <span className="font-medium text-salon-charcoal text-right leading-snug">{value}</span>
    </div>
  )
}

function StepNumber({ num, label, active, done }: { num: string; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 transition-colors duration-500 ${
      active || done ? 'text-salon-charcoal' : 'text-salon-sand'
    }`}>
      <span className="font-serif text-xl">{num}</span>
      <span className="text-[9px] tracking-salon uppercase font-medium">{label}</span>
    </div>
  )
}

function StepLine({ done }: { done: boolean }) {
  return (
    <div className="flex-1 mx-2 h-[1px] relative bg-salon-sand/30">
      <div 
        className={`absolute inset-y-0 left-0 bg-salon-charcoal transition-all duration-700 ease-out`}
        style={{ width: done ? '100%' : '0%' }}
      />
    </div>
  )
}
