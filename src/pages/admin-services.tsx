import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit2, Trash2, Clock, DollarSign, X, ShieldAlert, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import type { ServicePackage } from '@/shared/types'

export default function AdminServicesPage() {
  const [packages, setPackages] = useState<ServicePackage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null)
  const [name, setName] = useState('')
  const [duration, setDuration] = useState(60)
  const [price, setPrice] = useState(150000)
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    fetchPackages()
  }, [])

  function fetchPackages() {
    setLoading(true)
    setError(null)
    api.services
      .listForAdmin()
      .then((res) => {
        // Sort active first, then by name
        const sorted = [...res].sort((a, b) => {
          if (a.is_active === b.is_active) return a.name.localeCompare(b.name)
          return a.is_active ? -1 : 1
        })
        setPackages(sorted)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Gagal memuat paket layanan.')
      })
      .finally(() => {
        setLoading(false)
      })
  }

  function openCreateModal() {
    setEditingPackage(null)
    setName('')
    setDuration(60)
    setPrice(150000)
    setDescription('')
    setIsActive(true)
    setFormError(null)
    setModalOpen(true)
  }

  function openEditModal(pkg: ServicePackage) {
    setEditingPackage(pkg)
    setName(pkg.name)
    setDuration(pkg.duration_minutes)
    setPrice(pkg.price)
    setDescription(pkg.description ?? '')
    setIsActive(pkg.is_active)
    setFormError(null)
    setModalOpen(true)
  }

  async function handleDelete(pkg: ServicePackage) {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus paket layanan "${pkg.name}"?`)) {
      return
    }
    try {
      await api.services.delete(pkg.id)
      toast.success(`Paket "${pkg.name}" berhasil dihapus!`)
      fetchPackages()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus paket layanan.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    if (!name.trim()) {
      setFormError('Nama paket layanan wajib diisi.')
      setSubmitting(false)
      return
    }

    if (duration <= 0) {
      setFormError('Durasi pengerjaan harus lebih besar dari 0 menit.')
      setSubmitting(false)
      return
    }

    if (price < 0) {
      setFormError('Harga layanan tidak boleh negatif.')
      setSubmitting(false)
      return
    }

    try {
      const payload = {
        name: name.trim(),
        duration_minutes: duration,
        price,
        description: description.trim(),
        is_active: isActive,
      }

      if (editingPackage) {
        await api.services.update(editingPackage.id, payload)
        toast.success(`Paket "${name}" berhasil diperbarui!`)
      } else {
        await api.services.create(payload)
        toast.success(`Paket "${name}" berhasil ditambahkan!`)
      }
      setModalOpen(false)
      fetchPackages()
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
              Manajemen Layanan
            </h1>
          </div>
          
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-white text-salon-charcoal hover:bg-salon-cream px-6 py-3.5 text-xs tracking-salon transition-all duration-300 font-medium"
          >
            <Plus className="h-4 w-4" />
            TAMBAH LAYANAN
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
                onClick={fetchPackages} 
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
        ) : packages.length === 0 ? (
          <div className="border border-dashed border-salon-sand/60 py-20 text-center bg-white shadow-xl">
            <Plus className="mx-auto h-12 w-12 text-salon-sand mb-4" />
            <h3 className="font-serif text-2xl text-salon-charcoal mb-2">Belum Ada Layanan</h3>
            <p className="text-sm text-salon-taupe max-w-xs mx-auto mb-6">
              Silakan tambahkan paket layanan pertama Anda agar pelanggan dapat memesannya di halaman booking.
            </p>
            <button 
              onClick={openCreateModal}
              className="bg-salon-charcoal text-salon-cream hover:bg-salon-brown px-6 py-3 text-xs tracking-salon transition-colors"
            >
              TAMBAH LAYANAN SEKARANG
            </button>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
            {packages.map((p) => (
              <div 
                key={p.id} 
                className={`bg-white border p-6 md:p-8 flex flex-col justify-between min-h-[240px] transition-all duration-300 hover:shadow-lg ${
                  !p.is_active 
                    ? 'opacity-60 border-salon-sand/20 bg-salon-cream/10' 
                    : 'border-salon-sand/40 hover:border-salon-sand/80'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="text-[10px] font-mono tracking-salon text-salon-taupe">ID: {p.id}</p>
                      <h3 className="font-serif text-xl text-salon-charcoal mt-1 leading-tight">{p.name}</h3>
                    </div>
                    <span className={`text-[9px] tracking-salon font-semibold px-2 py-0.5 border uppercase ${
                      p.is_active 
                        ? 'bg-green-50 text-green-700 border-green-200/50' 
                        : 'bg-red-50 text-red-700 border-red-200/50'
                    }`}>
                      {p.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  
                  {p.description && (
                    <p className="text-xs text-salon-taupe line-clamp-3 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                  
                  <div className="space-y-1.5 text-xs text-salon-charcoal font-medium">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-salon-taupe" />
                      <span>Durasi: {p.duration_minutes} Menit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5 text-salon-taupe" />
                      <span>Harga: Rp {p.price.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-salon-sand/20 flex justify-between items-center mt-6">
                  <button 
                    onClick={() => handleDelete(p)} 
                    className="flex items-center gap-1 text-[11px] font-semibold tracking-salon text-red-600 hover:text-red-800 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    HAPUS
                  </button>
                  <button 
                    onClick={() => openEditModal(p)} 
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
                {editingPackage ? 'Edit Detail Layanan' : 'Tambah Layanan Baru'}
              </h2>
              <p className="text-xs text-salon-taupe leading-relaxed">
                {editingPackage ? 'Ubah informasi durasi, harga, atau deskripsi layanan.' : 'Lengkapi formulir untuk mendaftarkan layanan/paket treatment baru.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {formError && (
                <div className="bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                  {formError}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-[10px] font-semibold tracking-salon text-salon-charcoal block">NAMA LAYANAN</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Eyelash Extension Premium"
                  className="w-full border-0 border-b border-salon-sand bg-transparent px-0 py-2 text-salon-charcoal placeholder-salon-taupe/40 focus:ring-0 focus:border-salon-charcoal transition-colors text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold tracking-salon text-salon-charcoal block">DURASI (MENIT)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    placeholder="60"
                    className="w-full border-0 border-b border-salon-sand bg-transparent px-0 py-2 text-salon-charcoal placeholder-salon-taupe/40 focus:ring-0 focus:border-salon-charcoal transition-colors text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold tracking-salon text-salon-charcoal block">HARGA (RP)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    placeholder="250000"
                    className="w-full border-0 border-b border-salon-sand bg-transparent px-0 py-2 text-salon-charcoal placeholder-salon-taupe/40 focus:ring-0 focus:border-salon-charcoal transition-colors text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-semibold tracking-salon text-salon-charcoal block">DESKRIPSI LAYANAN</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tuliskan penjelasan detail mengenai teknik treatment, kelebihan, dan ketahanan..."
                  className="w-full border border-salon-sand/50 bg-transparent p-3 text-salon-charcoal placeholder-salon-taupe/40 focus:ring-1 focus:ring-salon-charcoal focus:border-salon-charcoal transition-colors text-sm rounded-none resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 border-salon-sand text-salon-charcoal focus:ring-salon-charcoal cursor-pointer"
                />
                <label htmlFor="is_active" className="text-xs font-semibold tracking-salon text-salon-charcoal select-none cursor-pointer">
                  LAYANAN AKTIF (DAPAT DIPESAN OLEH PELANGGAN)
                </label>
              </div>

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
                  {submitting ? 'MENYIMPAN...' : 'SIMPAN LAYANAN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
