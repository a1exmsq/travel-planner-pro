import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import type { User } from './AuthModal'
import type { InvitationDTO } from '../types/collaboration'

interface HeaderProps {
  user: User | null
  onLoginClick: () => void
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const navItems = [
  { to: '/', label: 'Discover' },
  { to: '/map', label: 'Plan trip' },
  { to: '/rankings', label: 'Rankings' },
  { to: '/leaderboard', label: 'Community' },
  { to: '/profile', label: 'Profile' },
]

function getLocationContext(pathname: string) {
  if (pathname.startsWith('/route/')) return 'Route workspace'
  if (pathname.startsWith('/cities/')) return 'City discovery'
  if (pathname.startsWith('/countries/')) return 'Country discovery'
  if (pathname.startsWith('/continents/')) return 'Continent discovery'
  if (pathname.startsWith('/map')) return 'Map builder'
  if (pathname.startsWith('/leaderboard')) return 'Community'
  if (pathname.startsWith('/profile')) return 'Profile'
  return 'Explore'
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M20.2 14.3A8.8 8.8 0 0 1 9.7 3.8a9.4 9.4 0 1 0 10.5 10.5Z" />
    </svg>
  )
}

export default function Header({ user, onLoginClick }: HeaderProps) {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [pendingInvites, setPendingInvites] = useState<InvitationDTO[]>([])
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const locationContext = getLocationContext(location.pathname)

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  useEffect(() => {
    if (!user) return

    api.get('/users/me/invitations')
      .then((response) => setPendingInvites(response.data || []))
      .catch(() => setPendingInvites([]))
  }, [user, location.pathname])

  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice.catch(() => null)
    setInstallPrompt(null)
  }

  return (
    <header className="sticky top-0 z-40 px-4 py-3 sm:px-6">
      <div className="glass-surface-strong mx-auto max-w-7xl rounded-[28px] px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-400 shadow-[0_8px_20px_rgba(15,118,110,0.32)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3c-2.8 2.8-4.5 5.9-4.5 9s1.7 6.2 4.5 9" />
                <path d="M12 3c2.8 2.8 4.5 5.9 4.5 9s-1.7 6.2-4.5 9" />
                <path d="M3.5 9.5h17M3.5 14.5h17" />
                <circle cx="12" cy="5.5" r="1.5" fill="white" stroke="none" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-white">Travel Planner Pro</div>
              <div className="text-[11px] text-slate-500 dark:text-white/48">Smart travel planning</div>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {!isOnline ? (
              <span className="rounded-full border border-amber-300/26 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100">
                Offline mode
              </span>
            ) : null}

            {installPrompt ? (
              <button
                onClick={() => void handleInstall()}
                className="rounded-2xl border border-teal-500/16 bg-teal-600 px-4 py-2 text-xs font-medium text-white transition-all hover:bg-teal-500 dark:border-cyan-300/18 dark:bg-cyan-300/10 dark:text-cyan-100"
              >
                Install app
              </button>
            ) : null}

            <button
              onClick={() => setDark((value) => !value)}
              className="relative flex h-10 w-[112px] items-center rounded-full border border-slate-200 bg-slate-100 px-1 transition-all dark:border-white/10 dark:bg-[#1e2433]"
              title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {/* Labels hug the far edge — circle is on the opposite side so no overlap */}
              <span className={`absolute left-3 text-[10px] font-semibold uppercase tracking-[0.14em] transition-opacity ${dark ? 'opacity-100 text-white/60' : 'opacity-0'}`}>
                Dark
              </span>
              <span className={`absolute right-3 text-[10px] font-semibold uppercase tracking-[0.14em] transition-opacity ${dark ? 'opacity-0' : 'opacity-100 text-slate-500'}`}>
                Light
              </span>
              <div
                className="absolute flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:bg-slate-600 dark:text-cyan-100"
                style={{ left: dark ? 'calc(100% - 36px)' : '4px' }}
              >
                {dark ? <MoonIcon /> : <SunIcon />}
              </div>
            </button>

            {user ? (
              <button
                onClick={() => navigate('/profile')}
                className="relative flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 py-1.5 text-left transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:border-white/20 dark:hover:bg-white/[0.06] sm:px-3"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-[11px] font-semibold text-white">
                  {user.username[0].toUpperCase()}
                </div>
                <div className="hidden min-w-0 sm:block">
                  <div className="truncate text-[12px] font-medium leading-none text-slate-800 dark:text-white/86">@{user.username}</div>
                  <div className="mt-1 text-[10px] leading-none text-slate-500 dark:text-cyan-100/64">
                    {pendingInvites.length > 0 ? `${pendingInvites.length} invite${pendingInvites.length === 1 ? '' : 's'}` : 'Profile'}
                  </div>
                </div>
                {pendingInvites.length > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">
                    {pendingInvites.length}
                  </span>
                ) : null}
              </button>
            ) : (
              <button
                onClick={onLoginClick}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-[#0f1117] dark:hover:bg-white/90"
              >
                Sign in
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/28">
            <span>Workspace</span>
            <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-white/18" />
            <span>{locationContext}</span>
          </div>

          <div className="overflow-x-auto pb-1">
            <nav className="flex min-w-max gap-2">
              {navItems.map((item) => {
                const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                      isActive
                        ? 'border-teal-500/20 bg-teal-500/10 text-teal-700 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-100'
                        : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/45 dark:hover:border-white/20 dark:hover:text-white/80'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}
