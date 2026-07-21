import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit2, Mail, Phone, X, ShieldAlert, ArrowLeft, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import type { Artist } from '@/shared/types'

export default function AdminArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [modalOpen, setModalOpen] = useState(false)
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [allowsStudio, setAllowsStudio] = useState(true)
  const [allowsHomeService, setAllowsHomeService] = useState(true)
  const [homeServiceStartTime, setHomeServiceStartTime] = useState('10:00')
  const [homeServiceEndTime, setHomeServiceEndTime] = useState('18:00')
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    fetchArtists()
  }, [])

  function fetchArtists() {
    setLoading(true)
    setError(null)
    api.artists
      .list()
      .then((res) => {
        // Sort: Active first, then by name
        const sorted = [...res].sort((a, b) => {
          if (a.is_active === b.is_active) return a.name.localeCompare(b.name)
          return a.is_active ? -1 : 1
        })
        setArtists(sorted)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Gagal memuat daftar artist.')
      })
      .finally(() => {
        setLoading(false)
      })
  }

  function openCreateModal() {
    setEditingArtist(null)
    setName('')
    setEmail('')
    setPhone('')
    setPassword('')
    setStartTime('09:00')
    setEndTime('17:00')
    setAllowsStudio(true)
    setAllowsHomeService(true)
    setHomeServiceStartTime('10:00')
    setHomeServiceEndTime('18:00')
    setIsActive(true)
    setFormError(null)
    setModalOpen(true)
  }

  function openEditModal(artist: Artist) {
    setEditingArtist(artist)
    setName(artist.name)
    setEmail(artist.email)
    setPhone(artist.phone)
    setPassword('')
    setStartTime(artist.start_time)
    setEndTime(artist.end_time)
    setAllowsStudio(artist.allows_studio ?? true)
    setAllowsHomeService(artist.allows_home_service ?? true)
    setHomeServiceStartTime(artist.home_service_start_time ?? '10:00')
    setHomeServiceEndTime(artist.home_service_end_time ?? '18:00')
    setIsActive(artist.is_active)
    setFormError(null)
    setModalOpen(true)
  }

  async function handleDelete(artist: Artist) {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus artist "${artist.name}"?`)) {
      return
    }
    try {
      await api.admin.artists.delete(artist.id)
      toast.success(`Artist "${artist.name}" berhasil dihapus!`)
      fetchArtists()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus artist.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    // Quick regex validation for HH:mm
    const timeRegex = /^\d{2}:\d{2}$/
    if (allowsStudio && (!timeRegex.test(startTime) || !timeRegex.test(endTime))) {
      setFormError('Format jam studio (mulai/selesai) harus HH:mm (contoh: 09:00).')
      setSubmitting(false)
      return
    }

    if (allowsHomeService && (!timeRegex.test(homeServiceStartTime) || !timeRegex.test(homeServiceEndTime))) {
      setFormError('Format jam home service (mulai/selesai) harus HH:mm (contoh: 10:00).')
      setSubmitting(false)
      return
    }

    if (!allowsStudio && !allowsHomeService) {
      setFormError('Artist harus melayani setidaknya satu lokasi (Di Studio atau Home Service).')
      setSubmitting(false)
      return
    }

    try {
      if (editingArtist) {
        // Update artist
        const payload: any = {
          name,
          email,
          phone,
          start_time: startTime,
          end_time: endTime,
          allows_studio: allowsStudio,
          allows_home_service: allowsHomeService,
          home_service_start_time: homeServiceStartTime,
          home_service_end_time: homeServiceEndTime,
          is_active: isActive,
        }
        if (password.trim()) {
          payload.password = password
        }
        await api.admin.artists.update(editingArtist.id, payload)
        toast.success(`Artist ${name} berhasil diperbarui!`)
      } else {
        // Create artist
        const payload = {
          name,
          email,
          phone,
          password: password.trim() ? password : 'artist123',
          start_time: startTime,
          end_time: endTime,
          allows_studio: allowsStudio,
          allows_home_service: allowsHomeService,
          home_service_start_time: homeServiceStartTime,
          home_service_end_time: homeServiceEndTime,
          is_active: isActive,
        }
        await api.admin.artists.create(payload)
        toast.success(`Artist ${name} berhasil ditambahkan!`)
      }
      setModalOpen(false)
      fetchArtists()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan data.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-salon-cream pb-24">
      {/* ─── HEADER ─── */}
      <div className="bg-salon-charcoal text-salon-cream pt-24 pb-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('/hero-lash.png')] bg-cover bg-center mix-blend-overlay" />
        
        <div className="relative mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-start md:items-end gap-6 z-10">
          <div className="space-y-2">
            <Link
              to="/admin/dashboard"
              className="text-[10px] tracking-salon text-salon-cream/50 hover:text-salon-cream transition-colors uppercase flex items-center gap-1.5 mb-2"
            >
              <ArrowLeft className="h-3 w-3" /> DASHBOARD
            </Link>
            <h1 className="font-serif text-4xl md:text-5xl tracking-tight">
              Manajemen Artist
            </h1>
          </div>
          
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-white text-salon-charcoal hover:bg-salon-cream px-6 py-3.5 text-xs tracking-salon transition-all duration-300 font-medium"
          >
            <Plus className="h-4 w-4" />
            TAMBAH ARTIST
          </button>
        </div>
      </div>

      {/* ─── CONTENT CONTAINER ─── */}
      <div className="mx-auto max-w-6xl px-6 md:px-10 mt-12 space-y-8 relative z-20">
        
        {error && (
          <div className="bg-red-50 border border-red-200 p-6 flex flex-col md:flex-row items-start gap-4 text-red-700 animate-in fade-in duration-300">
            <ShieldAlert className="h-6 w-6 flex-shrink-0 mt-0.5" />
            <div className="space-y-3">
              <p className="font-serif text-lg font-bold">Gagal memuat data</p>
              <p className="text-sm">{error}</p>
              <button 
                onClick={fetchArtists} 
                className="bg-red-700 text-white hover:bg-red-800 px-4 py-2 text-xs tracking-salon transition-colors"
              >
                COBA LAGI
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-salon-sand/30 p-8 h-48 animate-pulse shadow-sm" />
            ))}
          </div>
        ) : artists.length === 0 ? (
          <div className="border border-dashed border-salon-sand/60 py-20 text-center bg-white shadow-xl">
            <Plus className="mx-auto h-12 w-12 text-salon-sand mb-4" />
            <h3 className="font-serif text-2xl text-salon-charcoal mb-2">Belum Ada Artist</h3>
            <p className="text-sm text-salon-taupe max-w-xs mx-auto mb-6">
              Silakan tambahkan artist pertama Anda untuk mulai mengelola jadwal dan reservasi.
            </p>
            <button 
              onClick={openCreateModal}
              className="bg-salon-charcoal text-salon-cream hover:bg-salon-brown px-6 py-3 text-xs tracking-salon transition-colors"
            >
              TAMBAH ARTIST SEKARANG
            </button>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
            {artists.map((a) => (
              <div 
                key={a.id} 
                className={`bg-white border p-6 md:p-8 flex flex-col justify-between min-h-[220px] transition-all duration-300 hover:shadow-lg ${
                  !a.is_active 
                    ? 'opacity-60 border-salon-sand/20' 
                    : 'border-salon-sand/40 hover:border-salon-sand/80'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="text-[10px] font-mono tracking-salon text-salon-taupe">ID: #{a.id}</p>
                      <h3 className="font-serif text-xl text-salon-charcoal mt-1">{a.name}</h3>
                    </div>
                    <span className={`text-[9px] tracking-salon font-semibold px-2 py-0.5 border uppercase ${
                      a.is_active 
                        ? 'bg-green-50 text-green-700 border-green-200/50' 
                        : 'bg-red-50 text-red-700 border-red-200/50'
                    }`}>
                      {a.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  
                  <div className="space-y-3 text-xs text-salon-taupe leading-relaxed">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{a.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{a.phone}</span>
                    </div>
                    
                    <div className="space-y-1.5 pt-2 border-t border-salon-sand/20">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-salon-charcoal">Studio:</span>
                        {a.allows_studio !== false ? (
                          <span className="font-mono text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200/50">
                            {a.start_time} - {a.end_time}
                          </span>
                        ) : (
                          <span className="text-red-500 italic">Tidak Melayani</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-salon-charcoal">Home Service:</span>
                        {a.allows_home_service !== false ? (
                          <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/50">
                            {a.home_service_start_time || '10:00'} - {a.home_service_end_time || '18:00'}
                          </span>
                        ) : (
                          <span className="text-red-500 italic">Tidak Melayani</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-salon-sand/20 flex justify-between items-center">
                  <button 
                    onClick={() => handleDelete(a)} 
                    className="flex items-center gap-1 text-[11px] font-semibold tracking-salon text-red-600 hover:text-red-800 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    HAPUS
                  </button>
                  <button 
                    onClick={() => openEditModal(a)} 
                    className="flex items-center gap-1 text-[11px] font-semibold tracking-salon text-salon-charcoal hover:text-salon-brown transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    EDIT DETAIL
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── MODAL DIALOG ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white p-8 md:p-10 shadow-2xl border border-salon-sand/40 flex flex-col gap-6 animate-in zoom-in-95 duration-200 relative max-h-[90vh] overflow-y-auto">
            
            <button 
              onClick={() => setModalOpen(false)} 
              className="absolute top-6 right-6 text-salon-taupe hover:text-salon-charcoal transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="space-y-1">
              <h2 className="font-serif text-2xl text-salon-charcoal">
                {editingArtist ? 'Edit Detail Artist' : 'Tambah Artist Baru'}
              </h2>
              <p className="text-xs text-salon-taupe leading-relaxed">
                {editingArtist ? 'Ubah informasi personal, opsi lokasi, atau jam kerja artist.' : 'Lengkapi formulir untuk mendaftarkan artist baru.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {formError && (
                <div className="bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                  {formError}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-[10px] font-semibold tracking-salon text-salon-charcoal block">NAMA LENGKAP</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full border-0 border-b border-salon-sand bg-transparent px-0 py-2 text-salon-charcoal placeholder-salon-taupe/40 focus:ring-0 focus:border-salon-charcoal transition-colors text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold tracking-salon text-salon-charcoal block">EMAIL</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rina@chicbeauty.test"
                    className="w-full border-0 border-b border-salon-sand bg-transparent px-0 py-2 text-salon-charcoal placeholder-salon-taupe/40 focus:ring-0 focus:border-salon-charcoal transition-colors text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold tracking-salon text-salon-charcoal block">NO. HANDPHONE</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812..."
                    className="w-full border-0 border-b border-salon-sand bg-transparent px-0 py-2 text-salon-charcoal placeholder-salon-taupe/40 focus:ring-0 focus:border-salon-charcoal transition-colors text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-semibold tracking-salon text-salon-charcoal block">
                  PASSWORD {editingArtist && <span className="text-[9px] text-salon-taupe">(KOSONGKAN JIKA TIDAK DIUBAH)</span>}
                </label>
                <input
                  type="password"
                  required={!editingArtist}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingArtist ? '••••••••' : 'Min. 6 karakter'}
                  className="w-full border-0 border-b border-salon-sand bg-transparent px-0 py-2 text-salon-charcoal placeholder-salon-taupe/40 focus:ring-0 focus:border-salon-charcoal transition-colors text-sm"
                />
              </div>

              {/* ─── PENGATURAN STUDIO ─── */}
              <div className="border border-salon-sand/40 p-4 bg-salon-cream/20 space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allows_studio"
                    checked={allowsStudio}
                    onChange={(e) => setAllowsStudio(e.target.checked)}
                    className="h-4 w-4 border-salon-sand text-salon-charcoal focus:ring-salon-charcoal cursor-pointer"
                  />
                  <label htmlFor="allows_studio" className="text-xs font-bold tracking-salon text-salon-charcoal select-none cursor-pointer">
                    MELAYANI DI STUDIO
                  </label>
                </div>

                {allowsStudio && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold tracking-salon text-salon-taupe block uppercase">JAM MULAI STUDIO</label>
                      <input
                        type="text"
                        required={allowsStudio}
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        placeholder="09:00"
                        className="w-full border-0 border-b border-salon-sand bg-transparent px-0 py-1 text-salon-charcoal focus:ring-0 focus:border-salon-charcoal transition-colors text-sm font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold tracking-salon text-salon-taupe block uppercase">JAM SELESAI STUDIO</label>
                      <input
                        type="text"
                        required={allowsStudio}
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        placeholder="17:00"
                        className="w-full border-0 border-b border-salon-sand bg-transparent px-0 py-1 text-salon-charcoal focus:ring-0 focus:border-salon-charcoal transition-colors text-sm font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ─── PENGATURAN HOME SERVICE ─── */}
              <div className="border border-salon-sand/40 p-4 bg-salon-cream/20 space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allows_home_service"
                    checked={allowsHomeService}
                    onChange={(e) => setAllowsHomeService(e.target.checked)}
                    className="h-4 w-4 border-salon-sand text-salon-charcoal focus:ring-salon-charcoal cursor-pointer"
                  />
                  <label htmlFor="allows_home_service" className="text-xs font-bold tracking-salon text-salon-charcoal select-none cursor-pointer">
                    MELAYANI HOME SERVICE
                  </label>
                </div>

                {allowsHomeService && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold tracking-salon text-salon-taupe block uppercase">JAM MULAI HOME SERVICE</label>
                      <input
                        type="text"
                        required={allowsHomeService}
                        value={homeServiceStartTime}
                        onChange={(e) => setHomeServiceStartTime(e.target.value)}
                        placeholder="10:00"
                        className="w-full border-0 border-b border-salon-sand bg-transparent px-0 py-1 text-salon-charcoal focus:ring-0 focus:border-salon-charcoal transition-colors text-sm font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold tracking-salon text-salon-taupe block uppercase">JAM SELESAI HOME SERVICE</label>
                      <input
                        type="text"
                        required={allowsHomeService}
                        value={homeServiceEndTime}
                        onChange={(e) => setHomeServiceEndTime(e.target.value)}
                        placeholder="18:00"
                        className="w-full border-0 border-b border-salon-sand bg-transparent px-0 py-1 text-salon-charcoal focus:ring-0 focus:border-salon-charcoal transition-colors text-sm font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {editingArtist && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 border-salon-sand text-salon-charcoal focus:ring-salon-charcoal cursor-pointer"
                  />
                  <label htmlFor="is_active" className="text-xs font-semibold tracking-salon text-salon-charcoal select-none cursor-pointer">
                    ARTIST AKTIF (MELAYANI RESERVASI PELANGGAN)
                  </label>
                </div>
              )}

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="flex-1 bg-transparent border border-salon-sand text-salon-charcoal hover:bg-salon-sand/10 py-4 text-xs tracking-salon transition-colors"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] bg-salon-charcoal text-salon-cream hover:bg-salon-brown py-4 text-xs tracking-salon transition-colors disabled:opacity-50"
                >
                  {submitting ? 'MENYIMPAN...' : 'SIMPAN DATA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
