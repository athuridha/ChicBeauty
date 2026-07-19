import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'

import { api } from '@/lib/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { user } = await api.auth.login(email, password)
      toast.success(`Selamat datang kembali, ${user.name}!`)
      if (user.role === 'admin') {
        window.location.href = '/admin/dashboard'
      } else {
        window.location.href = '/dashboard/artist'
      }
    } catch (err) {
      toast.error('Login gagal', {
        description: err instanceof Error ? err.message : 'Email atau password salah.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-salon-cream flex flex-col md:flex-row overflow-hidden relative">
      
      {/* ─── LEFT ASYMMETRIC ASSET PANEL (Hidden on mobile) ─── */}
      <div className="hidden md:flex md:w-[45%] lg:w-[50%] bg-salon-charcoal relative overflow-hidden shrink-0 border-r border-salon-sand/10">
        <div className="absolute inset-0 bg-[url('/hero-lash.png')] bg-cover bg-center opacity-30 mix-blend-overlay scale-105" />
        
        <div className="relative flex flex-col justify-between h-full p-16 text-salon-cream z-10 w-full">
          {/* Logo Brand */}
          <Link to="/" className="inline-flex flex-col leading-none">
            <span className="font-serif text-3xl tracking-tight text-white">chicbeauty</span>
            <span className="mt-1 text-[9px] font-semibold uppercase tracking-salon text-salon-sand">
              home service
            </span>
          </Link>

          {/* Inspirational Tagline */}
          <div className="space-y-4">
            <h2 className="font-serif text-4xl lg:text-5xl text-white tracking-tight leading-none">
              Sentuhan <em className="not-italic text-salon-sand">Kecantikan</em> di Rumah Anda
            </h2>
            <p className="text-xs text-salon-sand/80 max-w-sm leading-relaxed">
              Selamat datang di portal kerja ChicBeauty. Khusus untuk administrator dan staf artist untuk mengelola reservasi, ketersediaan, serta layanan home service.
            </p>
          </div>

          {/* Footnote */}
          <div className="text-[10px] tracking-salon text-salon-sand/40 uppercase">
            © 2026 CHICBEAUTY INDONESIA
          </div>
        </div>
      </div>

      {/* ─── RIGHT FORM PANEL ─── */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-16 lg:p-24 bg-salon-cream relative z-10">
        <div className="w-full max-w-sm space-y-10">
          
          {/* Mobile Header Logo */}
          <div className="block md:hidden text-center">
            <Link to="/" className="inline-flex flex-col items-center leading-none">
              <span className="font-serif text-4xl tracking-tight text-salon-charcoal">chicbeauty</span>
              <span className="mt-1.5 text-[9px] font-semibold uppercase tracking-salon text-salon-taupe">
                home service
              </span>
            </Link>
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-3xl text-salon-charcoal leading-none">
              Login Staf
            </h1>
            <p className="text-xs text-salon-taupe leading-relaxed">
              Gunakan akun terdaftar Anda. Pelanggan tidak perlu masuk ke halaman ini.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-[10px] font-semibold tracking-salon text-salon-charcoal block uppercase"
              >
                EMAIL AKSES
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo@mail.com"
                  required
                  className="w-full border-0 border-b border-salon-sand bg-transparent px-0 py-2.5 text-sm text-salon-charcoal placeholder-salon-taupe/40 focus:ring-0 focus:border-salon-charcoal transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-[10px] font-semibold tracking-salon text-salon-charcoal block uppercase"
              >
                KATA SANDI
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full border-0 border-b border-salon-sand bg-transparent px-0 py-2.5 text-sm text-salon-charcoal placeholder-salon-taupe/40 focus:ring-0 focus:border-salon-charcoal transition-colors"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-salon-charcoal text-salon-cream hover:bg-salon-brown py-4 text-xs tracking-salon transition-colors font-semibold disabled:opacity-50"
              >
                {loading ? 'MEMPROSES MASUK...' : 'MASUK KE DASHBOARD'}
              </button>
            </div>
          </form>

          {/* Seed/Demo accounts info block */}
          <div className="p-5 border border-salon-sand/50 bg-white/40 space-y-2 text-xs">
            <p className="font-semibold tracking-salon text-salon-brown uppercase text-[10px]">
              AKUN DEMO
            </p>
            <div className="space-y-1 text-salon-taupe leading-relaxed">
              <p>
                <span className="font-semibold text-salon-charcoal">Admin:</span> demo@mail.com / <span className="font-mono">demo123</span>
              </p>
              <p>
                <span className="font-semibold text-salon-charcoal">Artist:</span> demo-artist@mail.com / <span className="font-mono">demo123</span>
              </p>
            </div>
          </div>

          <div className="text-center pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-[10px] tracking-salon text-salon-taupe hover:text-salon-charcoal transition-colors uppercase font-medium"
            >
              <ArrowLeft className="h-3 w-3" /> Kembali ke beranda
            </Link>
          </div>

        </div>
      </div>

    </main>
  )
}
