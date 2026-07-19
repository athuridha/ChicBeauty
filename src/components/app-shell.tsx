import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Contact,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  User,
  Users,
  X,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

interface CurrentUser {
  id: number
  role: 'admin' | 'artist'
  name: string
}

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Klien', href: '/admin/clients', icon: Contact },
  { label: 'Artist', href: '/admin/artists', icon: Users },
  { label: 'Layanan', href: '/admin/services', icon: Sparkles },
  { label: 'Aturan Bisnis', href: '/admin/rules', icon: Settings },
]

const ARTIST_NAV: NavItem[] = [
  { label: 'Kalender', href: '/dashboard/artist', icon: Calendar },
]

export default function AppShell() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [userLoaded, setUserLoaded] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const isAdminArea = location.pathname.startsWith('/admin')
  const isArtistArea = location.pathname.startsWith('/dashboard')
  const isClientProfile = location.pathname.startsWith('/clients')
  const isInternalArea = isAdminArea || isArtistArea || isClientProfile

  useEffect(() => {
    api.auth
      .me()
      .then((res) => setUser(res as CurrentUser))
      .catch(() => setUser(null))
      .finally(() => setUserLoaded(true))
  }, [])

  // Redirect if unauthorized to view admin/dashboard
  useEffect(() => {
    if (userLoaded && !user && isInternalArea) {
      navigate('/login', { replace: true })
    }
  }, [userLoaded, user, isInternalArea, navigate])

  // Track scroll position for navbar transparency
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = user
    ? user.role === 'admin'
      ? ADMIN_NAV
      : ARTIST_NAV
    : []

  async function handleLogout() {
    try {
      await api.auth.logout()
      toast.success('Berhasil logout')
      setUser(null)
      navigate('/')
    } catch {
      toast.error('Gagal logout')
    }
  }

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?'

  // ─── INTERNAL AREA (admin/artist) → Sidebar layout ───
  if (isInternalArea) {
    if (userLoaded && !user) {
      return null // let useEffect handle the redirect
    }

    return (
      <div className="flex min-h-screen bg-salon-cream">
        {/* Sidebar — desktop */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col bg-salon-charcoal">
          <SidebarContent
            user={user}
            navItems={navItems}
            onLogout={handleLogout}
            initials={initials}
          />
        </aside>

        {/* Sidebar — mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-salon-charcoal/50"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-64 bg-salon-charcoal flex flex-col">
              <SidebarContent
                user={user}
                navItems={navItems}
                onLogout={handleLogout}
                initials={initials}
                onNavigate={() => setMobileOpen(false)}
              />
            </aside>
          </div>
        )}

        {/* Main */}
        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-salon-sand/50 bg-salon-cream/95 px-4 backdrop-blur md:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden text-salon-charcoal"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="flex flex-col leading-none md:hidden">
              <span className="font-serif text-xl tracking-tight text-salon-charcoal">
                chicbeauty
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-3">
              {userLoaded && user && (
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-salon-warm text-salon-brown text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block leading-tight">
                    <p className="text-sm font-medium text-salon-charcoal">
                      {user.name}
                    </p>
                    <p className="text-[10px] uppercase tracking-salon text-salon-taupe">
                      {user.role}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    )
  }

  // ─── PUBLIC AREA → Horizontal navbar layout (Dandelion-style) ───
  return (
    <div className="min-h-screen bg-salon-cream">
      {/* Top Navbar */}
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          scrolled
            ? 'bg-salon-cream/95 backdrop-blur-md border-b border-salon-sand/40'
            : 'bg-transparent',
        )}
      >
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="flex h-20 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex flex-col leading-none">
              <span className="font-serif text-2xl tracking-tight text-salon-charcoal">
                chicbeauty
              </span>
              <span className="text-[10px] tracking-salon text-salon-taupe font-light uppercase mt-1">
                home service
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center gap-8">
              {[
                { label: 'BOOKING', href: '/booking' },
                { label: 'LAYANAN', href: '/services' },
                { label: 'KELOLA BOOKING', href: '/booking/manage' },
              ].map((link) => (
                <Link
                  key={link.href + link.label}
                  to={link.href}
                  className={cn(
                    'text-xs tracking-salon font-medium transition-colors duration-300',
                    location.pathname === link.href
                      ? 'text-salon-charcoal'
                      : 'text-salon-taupe hover:text-salon-charcoal',
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {userLoaded && user && (
                <Link
                  to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard/artist'}
                  className="hidden md:flex items-center gap-2 text-xs tracking-wide text-salon-taupe hover:text-salon-charcoal transition-colors"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-salon-warm text-salon-brown text-[10px]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  DASHBOARD
                </Link>
              )}
              {userLoaded && !user && (
                <Link
                  to="/login"
                  className="hidden md:block text-xs tracking-salon font-medium text-salon-taupe hover:text-salon-charcoal transition-colors"
                >
                  LOGIN
                </Link>
              )}

              {/* Mobile Hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-1"
                aria-label="Toggle menu"
              >
                {mobileOpen ? (
                  <X className="h-5 w-5 text-salon-charcoal" />
                ) : (
                  <Menu className="h-5 w-5 text-salon-charcoal" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-salon-charcoal/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute top-20 left-0 right-0 bg-salon-cream border-b border-salon-sand/40 py-8 px-6">
            <nav className="flex flex-col gap-6">
              {[
                { label: 'BOOKING', href: '/booking' },
                { label: 'LAYANAN', href: '/services' },
                { label: 'KELOLA BOOKING', href: '/booking/manage' },
              ].map((link) => (
                <Link
                  key={link.href + link.label}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-lg tracking-wide text-salon-charcoal font-light"
                >
                  {link.label}
                </Link>
              ))}
              <Separator className="bg-salon-sand/40" />
              {userLoaded && user ? (
                <Link
                  to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard/artist'}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm tracking-salon text-salon-taupe"
                >
                  DASHBOARD
                </Link>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-sm tracking-salon text-salon-taupe"
                >
                  LOGIN STAF
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main>
        <Outlet />
      </main>
    </div>
  )
}

// ─── Sidebar Content (used only for internal/admin pages) ───

interface SidebarContentProps {
  user: CurrentUser | null
  navItems: NavItem[]
  onLogout: () => void
  initials: string
  onNavigate?: () => void
}

function SidebarContent({
  user,
  navItems,
  onLogout,
  initials,
  onNavigate,
}: SidebarContentProps) {
  const location = useLocation()
  return (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-salon-sand/10 px-5">
        <Link to="/" className="flex flex-col leading-none">
          <span className="font-serif text-xl tracking-tight text-salon-cream">
            chicbeauty
          </span>
          <span className="mt-0.5 text-[9px] font-light uppercase tracking-salon text-salon-sand/50">
            admin panel
          </span>
        </Link>
        <button
          onClick={onNavigate}
          className="ml-auto md:hidden text-salon-cream"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1.5 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = location.pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-sm px-3 py-3 text-xs font-semibold uppercase tracking-salon transition-all duration-300',
                active
                  ? 'bg-salon-brown text-salon-cream shadow-inner'
                  : 'text-salon-sand/70 hover:bg-salon-brown/30 hover:text-salon-cream',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-salon-sand/10 p-4 space-y-4">
        {user ? (
          <>
            <div className="flex items-center gap-3 px-2 py-1.5">
              <Avatar className="h-9 w-9 border border-salon-sand/20">
                <AvatarFallback className="bg-salon-brown text-salon-cream text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="leading-tight">
                <p className="text-sm font-medium text-salon-cream">
                  {user.name}
                </p>
                <p className="text-[10px] uppercase tracking-salon text-salon-sand/50 mt-0.5">
                  {user.role}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-xs font-semibold uppercase tracking-salon text-salon-sand/60 transition-all duration-300 hover:bg-salon-brown/30 hover:text-salon-cream"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="flex w-full items-center justify-center gap-2 rounded-sm border border-salon-sand/20 px-3 py-2.5 text-xs font-semibold uppercase tracking-salon text-salon-sand/70 transition-all duration-300 hover:bg-salon-brown/30 hover:text-salon-cream"
          >
            <User className="h-4 w-4" />
            Login Staf
          </Link>
        )}
      </div>
    </>
  )
}
