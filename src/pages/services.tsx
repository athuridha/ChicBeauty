import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import type { ServicePackage } from '@/shared/types'

// ─── Fade-in on scroll section ───
function FadeInSection({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay)
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      } ${className}`}
    >
      {children}
    </div>
  )
}

export default function ServicesPage() {
  const [heroLoaded, setHeroLoaded] = useState(false)
  const [packages, setPackages] = useState<ServicePackage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setHeroLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    api.services
      .list()
      .then(setPackages)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-salon-cream min-h-screen">
      {/* ═══════════════════════════════════════════ */}
      {/* SECTION 1 — HERO BANNER */}
      {/* ═══════════════════════════════════════════ */}
      <section className="relative h-[70vh] md:h-[80vh] w-full overflow-hidden">
        <div
          className={`absolute inset-0 transition-opacity duration-1500 ease-out ${
            heroLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src="/service-lash.png"
            alt="Eyelash Extension Services"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-salon-charcoal/60 via-salon-charcoal/30 to-transparent" />
        </div>

        <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 lg:px-24">
          <div className="max-w-xl">
            <h1
              className={`font-serif text-4xl md:text-5xl lg:text-7xl text-salon-cream tracking-tight leading-tight transition-all duration-1000 ease-out ${
                heroLoaded
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              }`}
            >
              Layanan <br />
              <em>Premium Kami</em>
            </h1>
            <p
              className={`mt-6 text-sm md:text-base text-salon-cream/90 max-w-sm leading-relaxed transition-all duration-1000 delay-300 ease-out ${
                heroLoaded
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              }`}
            >
              Tersedia di Studio & Home Service. Dirancang untuk menonjolkan kecantikan alami Anda dengan standar kualitas tertinggi.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* SECTION 2 — PIONEER / PHILOSOPHY */}
      {/* ═══════════════════════════════════════════ */}
      <section className="py-20 md:py-32">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-center">
            <FadeInSection>
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-salon-charcoal leading-tight">
                Pioneer of premium lash extensions
              </h2>
              <div className="mt-8 space-y-6 text-sm leading-relaxed text-salon-taupe max-w-md">
                <p>
                  Kami menawarkan layanan premium eyelash extension (Classic, Volume, Mega Volume)
                  yang kini hadir lebih dekat dengan Anda. Nikmati pelayanan di Studio kami 
                  atau pesan layanan <strong>Home Service</strong>, di mana artist profesional kami 
                  akan datang ke rumah Anda dengan membawa bed portabel dan perlengkapan steril.
                </p>
                <p>
                  Tidak hanya itu, kami memastikan bahwa semua produk yang digunakan
                  adalah material teraman, diimpor langsung, dan diaplikasikan
                  oleh artist bersertifikasi.
                </p>
              </div>
            </FadeInSection>
            <FadeInSection delay={200} className="hidden md:block">
              <img
                src="/hero-lash.png"
                alt="Premium Lash"
                className="w-full aspect-[4/3] object-cover"
              />
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* SECTION 3 — SERVICE PACKAGES MENU */}
      {/* ═══════════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-[1000px] px-6 md:px-10 text-center">
          <FadeInSection>
            <h2 className="font-serif text-3xl md:text-5xl tracking-wide text-salon-charcoal uppercase">
              TREATMENTS
            </h2>
            <div className="mt-4 h-[1px] w-16 bg-salon-taupe mx-auto" />
          </FadeInSection>

          <div className="mt-16 md:mt-24 space-y-12">
            {loading ? (
              <div className="text-center text-sm text-salon-taupe">Memuat daftar layanan...</div>
            ) : packages.length === 0 ? (
              <div className="text-center text-sm text-salon-taupe">Belum ada layanan terdaftar.</div>
            ) : (
              packages.map((pkg, index) => (
                <FadeInSection key={pkg.id} delay={index * 150}>
                  <div className="flex flex-col md:flex-row justify-between items-center md:items-end border-b border-salon-sand/40 pb-8 gap-6">
                    {/* Info */}
                    <div className="text-center md:text-left flex-1">
                      <h3 className="font-serif text-2xl md:text-3xl text-salon-charcoal">
                        {pkg.name}
                      </h3>
                      <div className="mt-3 flex items-center justify-center md:justify-start gap-4 text-sm text-salon-taupe">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {pkg.duration_minutes} Menit
                        </span>
                        <span className="text-salon-sand">|</span>
                        <span>Rp {pkg.price.toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="flex-1 text-sm text-salon-taupe leading-relaxed text-center md:text-left px-0 md:px-8">
                      {pkg.description}
                    </div>

                    {/* Action */}
                    <div className="mt-4 md:mt-0 flex-shrink-0">
                      <Link
                        to="/booking"
                        className="inline-flex items-center justify-center px-8 py-3 border border-salon-charcoal text-xs tracking-salon text-salon-charcoal hover:bg-salon-charcoal hover:text-salon-cream transition-colors duration-300"
                      >
                        BOOK NOW
                      </Link>
                    </div>
                  </div>
                </FadeInSection>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* SECTION 4 — SAFETY & PRODUCT HIGHLIGHT */}
      {/* ═══════════════════════════════════════════ */}
      <section className="relative py-32 md:py-48 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/service-safety.png"
            alt="Safety and Premium Products"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-salon-charcoal/40" />
        </div>
        
        <div className="relative mx-auto max-w-[1400px] px-6 md:px-10 flex flex-col items-center md:items-end text-center md:text-right text-salon-cream">
          <FadeInSection className="max-w-md">
            <p className="text-[10px] tracking-salon font-semibold mb-4 uppercase">
              Product Highlight
            </p>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl tracking-tight leading-tight">
              Safety at <br className="hidden md:block" />
              <em>ChicBeauty</em>
            </h2>
            <p className="mt-6 text-sm md:text-base leading-relaxed text-salon-cream/90">
              Semua material kami bebas formaldehyde dan didesain untuk
              memastikan kesehatan bulu mata asli Anda tetap terjaga. 
              Kenyamanan dan keamanan klien adalah prioritas utama.
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* SECTION 5 — GUARANTEE */}
      {/* ═══════════════════════════════════════════ */}
      <section className="py-20 md:py-32 bg-salon-cream border-b border-salon-sand/40">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12 md:gap-24">
            <FadeInSection>
              <h2 className="font-serif text-3xl md:text-4xl text-salon-charcoal">
                Guarantee Period
              </h2>
            </FadeInSection>

            <div className="space-y-12">
              <FadeInSection delay={150}>
                <h4 className="text-sm font-semibold tracking-wide text-salon-charcoal uppercase">
                  FREE REPAIRS
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-salon-taupe max-w-xl">
                  Berlaku dalam waktu 3 hari setelah treatment eyelash extension
                  jika Anda mengalami rontok prematur (lebih dari 5-6 helai per hari)
                  atau ketidaknyamanan lainnya, tanpa biaya tambahan.
                </p>
              </FadeInSection>
              
              <FadeInSection delay={300}>
                <h4 className="text-sm font-semibold tracking-wide text-salon-charcoal uppercase">
                  QUALITY ASSURANCE
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-salon-taupe max-w-xl">
                  Jika Anda merasakan iritasi atau ketidaknyamanan setelah treatment, 
                  segera hubungi kami. Kami menjamin standar kebersihan (hygiene)
                  yang ketat untuk semua alat dan lingkungan klinik.
                </p>
              </FadeInSection>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
