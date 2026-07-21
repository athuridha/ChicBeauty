import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Percent, Clock, AlertTriangle, Timer, MapPin } from 'lucide-react'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import type { BusinessRules } from '@/shared/types'

export default function AdminRulesPage() {
  const [rules, setRules] = useState<BusinessRules | null>(null)
  const [form, setForm] = useState<Partial<BusinessRules>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.admin.rules
      .get()
      .then((r) => {
        setRules(r)
        setForm({
          deposit_percentage: r.deposit_percentage,
          cancel_threshold_hours: r.cancel_threshold_hours,
          penalty_percentage: r.penalty_percentage,
          buffer_minutes: r.buffer_minutes,
          allow_studio: r.allow_studio ?? true,
          allow_home_service: r.allow_home_service ?? true,
        })
      })
      .catch((e) =>
        toast.error('Gagal memuat aturan', {
          description: e instanceof Error ? e.message : undefined,
        }),
      )
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await api.admin.rules.update(form)
      setRules(updated)
      toast.success('Aturan bisnis berhasil disimpan')
    } catch (err) {
      toast.error('Gagal menyimpan', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  function renderField(
    label: string,
    description: string,
    key: keyof BusinessRules,
    suffix: string,
    icon: React.ReactNode,
  ) {
    return (
      <div className="border border-salon-sand/40 p-6 md:p-8 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all duration-300 hover:shadow-md">
        <div className="space-y-1.5 max-w-md">
          <div className="flex items-center gap-2 font-serif text-lg text-salon-charcoal">
            <div className="p-1.5 bg-salon-cream/50 rounded-sm text-salon-taupe">
              {icon}
            </div>
            {label}
          </div>
          <p className="text-xs text-salon-taupe leading-relaxed">{description}</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          <input
            type="number"
            min={0}
            className="w-full md:w-28 border-0 border-b border-salon-sand bg-transparent px-0 py-1.5 text-sm text-salon-charcoal focus:ring-0 focus:border-salon-charcoal transition-colors text-right font-mono font-bold"
            value={form[key] as number}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, [key]: Number(e.target.value) }))
            }
          />
          <span className="text-xs tracking-salon text-salon-taupe font-semibold shrink-0 uppercase">{suffix}</span>
        </div>
      </div>
    )
  }

  function renderToggleField(
    label: string,
    description: string,
    key: 'allow_studio' | 'allow_home_service',
    icon: React.ReactNode,
  ) {
    const isEnabled = form[key] ?? true
    return (
      <div className="border border-salon-sand/40 p-6 md:p-8 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all duration-300 hover:shadow-md">
        <div className="space-y-1.5 max-w-md">
          <div className="flex items-center gap-2 font-serif text-lg text-salon-charcoal">
            <div className="p-1.5 bg-salon-cream/50 rounded-sm text-salon-taupe">
              {icon}
            </div>
            {label}
          </div>
          <p className="text-xs text-salon-taupe leading-relaxed">{description}</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, [key]: !isEnabled }))}
            className={`px-4 py-2 text-xs font-semibold tracking-salon transition-all duration-300 border ${
              isEnabled
                ? 'bg-green-700 text-white border-green-700'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {isEnabled ? 'AKTIF (ON)' : 'NONAKTIF (OFF)'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-salon-cream pb-24">
      {/* ─── HEADER ─── */}
      <div className="bg-salon-charcoal text-salon-cream pt-24 pb-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('/hero-lash.png')] bg-cover bg-center mix-blend-overlay" />
        
        <div className="relative mx-auto max-w-3xl flex flex-col justify-between items-start gap-4 z-10">
          <Link
            to="/admin/dashboard"
            className="text-[10px] tracking-salon text-salon-cream/50 hover:text-salon-cream transition-colors uppercase flex items-center gap-1.5 mb-2"
          >
            <ArrowLeft className="h-3 w-3" /> DASHBOARD
          </Link>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight">
            Aturan Bisnis
          </h1>
          <p className="text-sm text-salon-cream/70 max-w-md leading-relaxed">
            Pengaturan global yang berlaku otomatis untuk semua jenis paket dan reservasi.
          </p>
        </div>
      </div>

      {/* ─── CONTENT ─── */}
      <div className="mx-auto max-w-3xl px-6 mt-12 relative z-20">
        {rules ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {renderToggleField(
                'Layanan Di Studio',
                'Aktifkan atau matikan fitur reservasi langsung di studio untuk seluruh pelanggan.',
                'allow_studio',
                <MapPin className="h-4 w-4" />,
              )}
              {renderToggleField(
                'Layanan Home Service',
                'Aktifkan atau matikan fitur reservasi home service (kunjungan rumah) untuk seluruh pelanggan.',
                'allow_home_service',
                <MapPin className="h-4 w-4" />,
              )}
              {renderField(
                'Deposit Reservasi',
                'Persentase nominal uang muka yang wajib dibayar klien untuk mengonfirmasi jadwal booking.',
                'deposit_percentage',
                '% dari paket',
                <Percent className="h-4 w-4" />,
              )}
              {renderField(
                'Cancel Threshold (Batas Pembatalan)',
                'Batas waktu minimal (jam) sebelum treatment untuk membatalkan jadwal tanpa dikenakan penalty.',
                'cancel_threshold_hours',
                'jam sebelum',
                <Clock className="h-4 w-4" />,
              )}
              {renderField(
                'Penalty Pembatalan',
                'Persentase nominal deposit yang akan hangus/penalti jika klien membatalkan jadwal di bawah jam threshold.',
                'penalty_percentage',
                '% dari deposit',
                <AlertTriangle className="h-4 w-4" />,
              )}
              {renderField(
                'Jeda Waktu Buffer',
                'Buffer jeda waktu istirahat artist antar sesi treatment. Dihitung secara otomatis saat pencarian slot kosong.',
                'buffer_minutes',
                'menit jeda',
                <Timer className="h-4 w-4" />,
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full md:w-auto bg-salon-charcoal text-salon-cream hover:bg-salon-brown px-10 py-4 text-xs tracking-salon transition-colors disabled:opacity-50 font-semibold"
              >
                {saving ? 'MENYIMPAN...' : 'SIMPAN ATURAN BISNIS'}
              </button>
            </div>
          </form>
        ) : (
          <div className="py-20 text-center text-salon-taupe border border-dashed border-salon-sand bg-white shadow-xl">
            Memuat parameter aturan bisnis...
          </div>
        )}
      </div>
    </main>
  )
}
