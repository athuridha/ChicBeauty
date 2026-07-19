import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

// ─── Quick Link Item ───
function QuickLink({ label, href }: { label: string; href: string }) {
  return (
    <li>
      <Link
        to={href}
        className="group flex items-center justify-between py-3 border-b border-salon-sand/50 transition-all duration-300 hover:pl-2"
      >
        <span className="text-sm tracking-salon font-medium text-salon-charcoal group-hover:font-semibold transition-all duration-300">
          {label}
        </span>
        <svg
          className="w-4 h-4 text-salon-taupe opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
        </svg>
      </Link>
    </li>
  )
}

// ─── Service Word with Hover Image ───
function ServiceWord({
  word,
  imageSrc,
  delay,
}: {
  word: string
  imageSrc: string
  delay: number
}) {
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <span
      className="relative inline-block cursor-default"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className={`transition-all duration-700 ease-out ${
          visible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        {word}
      </span>

      {/* Hover reveal image */}
      <span
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 transition-all duration-500 ease-out ${
          hovered
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-75'
        }`}
      >
        <img
          src={imageSrc}
          alt=""
          className="w-48 h-32 md:w-64 md:h-44 object-cover rounded-sm shadow-lg"
        />
      </span>
    </span>
  )
}

// ─── Fade-in on scroll section ───
function FadeInSection({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

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

// ─── Main Home Page ───
export default function HomePage() {
  const [heroLoaded, setHeroLoaded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setHeroLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {/* ═══════════════════════════════════════════ */}
      {/* SECTION 1 — HERO (Split Screen) */}
      {/* ═══════════════════════════════════════════ */}
      <section className="min-h-[100dvh] grid grid-cols-1 md:grid-cols-2">
        {/* Left — Text Content */}
        <div className="flex flex-col justify-center px-6 md:px-12 lg:px-20 py-32 md:py-20">
          <div className="max-w-lg">
            {/* Heading */}
            <h1
              className={`font-serif text-3xl md:text-4xl lg:text-[2.8rem] leading-tight tracking-tight text-salon-charcoal transition-all duration-1000 ease-out ${
                heroLoaded
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-6'
              }`}
            >
              ChicBeauty adalah klinik premium yang mengkhususkan{' '}
              <em className="not-italic text-salon-brown">eyelash extension.</em>
            </h1>

            {/* Subtitle */}
            <p
              className={`mt-6 text-sm md:text-base text-salon-taupe max-w-sm leading-relaxed transition-all duration-1000 delay-300 ease-out ${
                heroLoaded
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              }`}
            >
              Layanan eyelash extension premium langsung di kenyamanan rumah Anda. Artist profesional kami siap datang dengan perlengkapan salon terlengkap.
            </p>

            {/* Quick Links */}
            <ul
              className={`mt-10 max-w-xs transition-all duration-1000 delay-500 ease-out ${
                heroLoaded
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-6'
              }`}
            >
              <QuickLink label="BOOKING" href="/booking" />
              <QuickLink label="KELOLA BOOKING" href="/booking/manage" />
              <QuickLink label="LOGIN STAF" href="/login" />
            </ul>
          </div>
        </div>

        {/* Right — Hero Image */}
        <div
          className={`relative overflow-hidden transition-all duration-1200 ease-out ${
            heroLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="absolute inset-0 bg-salon-warm md:hidden" />
          <img
            src="/hero-lash.png"
            alt="Eyelash extension treatment"
            className="w-full h-64 md:h-full object-cover"
          />
          {/* Subtle overlay gradient on mobile */}
          <div className="absolute inset-0 bg-gradient-to-t from-salon-cream/60 to-transparent md:hidden" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* SECTION 2 — Large Typography Services */}
      {/* ═══════════════════════════════════════════ */}
      <section className="py-24 md:py-40 bg-salon-cream">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <FadeInSection className="flex flex-col items-center text-center">
            <div className="text-5xl md:text-7xl lg:text-[6rem] xl:text-[7.5rem] font-light tracking-tight text-salon-charcoal/80 leading-none space-y-2 md:space-y-4">
              <ServiceWord word="EXTENSION," imageSrc="/service-lash.png" delay={0} />
              <br className="hidden md:block" />
              <span className="md:hidden"> </span>
              <ServiceWord word="LASH LIFT," imageSrc="/service-nails.png" delay={150} />
              <br className="hidden md:block" />
              <span className="md:hidden"> </span>
              <ServiceWord word="LASH FILLER" imageSrc="/service-treatment.png" delay={300} />
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* SECTION 3 — Our Services (Asymmetric) */}
      {/* ═══════════════════════════════════════════ */}
      <section className="py-20 md:py-32 bg-salon-cream">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <FadeInSection>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-12 md:gap-20">
              {/* Left — Heading + Description */}
              <div>
                <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl tracking-tight text-salon-charcoal">
                  Our <em>Services</em>
                </h2>

                <div className="mt-10 md:mt-14 max-w-sm">
                  <p className="text-sm leading-relaxed text-salon-taupe">
                    Kami selalu berusaha memberikan yang terbaik untuk
                    klien kami, dan itulah mengapa kami menggunakan
                    produk berkualitas tinggi dari seluruh dunia.
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-salon-taupe">
                    Mulai dari Eyelash Extension, Lash Lift,
                    Lash Filler, hingga LED Lash Extension — semua
                    treatment menggunakan teknik terkini dengan
                    produk premium yang aman.
                  </p>
                </div>

                {/* Small accent image */}
                <div className="mt-10 hidden md:block">
                  <img
                    src="/service-treatment.png"
                    alt="Lash treatment"
                    className="w-48 h-32 object-cover"
                  />
                </div>
              </div>

              {/* Right — Staggered Images */}
              <div className="grid grid-cols-2 gap-4">
                <div className="mt-0 md:mt-16">
                  <img
                    src="/service-lash.png"
                    alt="Eyelash extension result"
                    className="w-full aspect-[3/4] object-cover"
                  />
                </div>
                <div className="mt-0 md:-mt-8">
                  <img
                    src="/service-nails.png"
                    alt="Beauty treatment"
                    className="w-full aspect-[3/4] object-cover"
                  />
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* SECTION 4 — CTA Booking */}
      {/* ═══════════════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-salon-charcoal text-salon-cream">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <FadeInSection>
            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-12 items-center">
              <div>
                <p className="text-xs tracking-salon text-salon-sand/70 mb-4">
                  BOOKING
                </p>
                <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-salon-cream leading-tight">
                  Tingkatkan standar kecantikan Anda bersama ChicBeauty.
                </h2>
                <div className="mt-8 space-y-6 text-sm leading-relaxed text-salon-sand/70 max-w-md">
                  <p>
                    Nikmati layanan premium eyelash extension tanpa perlu keluar rumah. 
                    Artist bersertifikasi kami akan membawa pengalaman salon eksklusif 
                    langsung ke tempat Anda (<strong>Home Service</strong>).
                  </p>
                  <p>
                    Semua produk kami diimpor langsung, steril, dan dijamin aman.
                  </p>
                </div>
                <div className="mt-10 flex flex-wrap gap-4">
                  <Link
                    to="/booking"
                    className="inline-flex items-center gap-2 px-6 py-3 border border-salon-sand/30 text-xs tracking-salon font-medium text-salon-cream hover:bg-salon-cream hover:text-salon-charcoal transition-all duration-500"
                  >
                    BOOKING SEKARANG
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                    </svg>
                  </Link>
                  <Link
                    to="/booking/manage"
                    className="inline-flex items-center gap-2 px-6 py-3 text-xs tracking-salon font-medium text-salon-sand/70 hover:text-salon-cream transition-colors duration-300"
                  >
                    LIHAT BOOKING SAYA
                  </Link>
                </div>
              </div>

              <div className="hidden md:block">
                <img
                  src="/hero-lash.png"
                  alt="Beauty treatment result"
                  className="w-full aspect-[4/5] object-cover opacity-80"
                />
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* SECTION 5 — Footer */}
      {/* ═══════════════════════════════════════════ */}
      <footer className="py-16 md:py-24 bg-salon-cream border-t border-salon-sand/40">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <FadeInSection>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr] gap-12 md:gap-20">
              {/* Logo */}
              <div>
                <Link to="/" className="inline-flex flex-col leading-none">
                  <span className="font-serif text-3xl tracking-tight text-salon-charcoal">
                    ChicBeauty
                  </span>
                  <span className="text-[10px] tracking-salon text-salon-taupe font-light uppercase mt-1">
                    studio & home service
                  </span>
                </Link>
              </div>

              {/* Links Column 1 */}
              <div>
                <ul className="space-y-4">
                  {[
                    { label: 'BOOKING TREATMENT', href: '/booking' },
                    { label: 'KELOLA BOOKING', href: '/booking/manage' },
                    { label: 'LOGIN STAF', href: '/login' },
                  ].map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.href}
                        className="text-xs tracking-salon text-salon-taupe hover:text-salon-charcoal transition-colors duration-300"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Info Column */}
              <div>
                <p className="text-xs tracking-salon text-salon-taupe mb-4">
                  LOKASI
                </p>
                <p className="text-sm leading-relaxed text-salon-brown">
                  ChicBeauty
                </p>
                <p className="text-sm leading-relaxed text-salon-taupe mt-2">
                  Layanan Home Service Eksklusif
                  <br />
                  dengan artist bersertifikasi.
                </p>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="mt-16 pt-8 border-t border-salon-sand/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <p className="text-[11px] text-salon-taupe/60">
                &copy; {new Date().getFullYear()} ChicBeauty. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-salon-taupe hover:text-salon-charcoal transition-colors"
                  aria-label="Instagram"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="5" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </a>
                <a
                  href="https://wa.me/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-salon-taupe hover:text-salon-charcoal transition-colors"
                  aria-label="WhatsApp"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
              </div>
            </div>
          </FadeInSection>
        </div>
      </footer>
    </>
  )
}
