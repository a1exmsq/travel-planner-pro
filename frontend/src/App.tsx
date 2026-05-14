import { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import api from './api/axios'
import AuthModal from './components/AuthModal'
import CookieConsentBanner from './components/CookieConsentBanner'
import ErrorBoundary from './components/ErrorBoundary'
import Header from './components/Header'
import type { User } from './components/AuthModal'

const Explore = lazy(() => import('./pages/Explore'))
const Home = lazy(() => import('./pages/Home'))
const Profile = lazy(() => import('./pages/Profile'))
const RoutePage = lazy(() => import('./pages/RoutePage'))
const EditRoutePage = lazy(() => import('./pages/EditRoutePage'))
const ContinentPage = lazy(() => import('./pages/ContinentPage'))
const CountryPage = lazy(() => import('./pages/CountryPage'))
const CityPage = lazy(() => import('./pages/CityPage'))
const ItineraryPage = lazy(() => import('./pages/ItineraryPage'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'))
const RankingsPage = lazy(() => import('./pages/RankingsPage'))
const BudgetPage = lazy(() => import('./pages/BudgetPage'))
const PackingPage = lazy(() => import('./pages/PackingPage'))
const JournalPage = lazy(() => import('./pages/JournalPage'))

function RouteFallback() {
  return (
    <div className="app-loading-shell flex flex-1">
      <div className="app-loading-card">
        <div className="app-loading-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="mt-4 text-base font-semibold text-slate-900 dark:text-white">Opening the next travel layer</div>
        <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/46">
          Pulling together the route, places, and details so the next screen feels ready to use.
        </p>
      </div>
    </div>
  )
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const res = await api.get('/auth/me')
        setUser(res.data)
      } catch {
        localStorage.removeItem('token')
      } finally {
        setLoading(false)
      }
    }

    void checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="app-loading-shell h-full">
        <div className="app-loading-card">
          <div className="app-loading-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="mt-4 text-base font-semibold text-slate-900 dark:text-white">Preparing Travel Planner Pro</div>
          <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/46">
            Restoring your session, theme, and travel workspace.
          </p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(data: User | { token?: string; user?: User }) => {
          if ('token' in data && data.token) {
            localStorage.setItem('token', data.token)
          }

          const nextUser = 'user' in data && data.user
            ? data.user
            : 'username' in data
              ? data
              : null
          setUser(nextUser)
          setIsAuthOpen(false)
        }}
      />

      <div className="app-shell flex h-full flex-col">
        <Header user={user} onLoginClick={() => setIsAuthOpen(true)} />

        <div className="flex min-h-0 flex-1 flex-col">
          <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route
                path="/"
                element={<Explore currentUser={user} onLoginRequest={() => setIsAuthOpen(true)} />}
              />
              <Route path="/map" element={<Home user={user} setIsAuthOpen={setIsAuthOpen} />} />
              <Route path="/profile" element={<Profile user={user} />} />
              <Route
                path="/route/:id"
                element={<RoutePage currentUser={user} onLoginRequest={() => setIsAuthOpen(true)} />}
              />
              <Route path="/route/:id/edit" element={<EditRoutePage currentUser={user} />} />
              <Route path="/route/:id/itinerary" element={<ItineraryPage currentUser={user} />} />
              <Route path="/route/:id/budget" element={<BudgetPage currentUser={user} />} />
              <Route path="/route/:id/packing" element={<PackingPage currentUser={user} />} />
              <Route path="/route/:id/journal" element={<JournalPage currentUser={user} />} />
              <Route path="/leaderboard" element={<LeaderboardPage currentUser={user} />} />
              <Route path="/rankings" element={<RankingsPage />} />
              <Route path="/explore" element={<Navigate to="/" replace />} />
              <Route
                path="/countries/:id"
                element={<CountryPage currentUser={user} onLoginRequest={() => setIsAuthOpen(true)} />}
              />
              <Route path="/continents/:id" element={<ContinentPage />} />
              <Route
                path="/cities/:id"
                element={<CityPage currentUser={user} onLoginRequest={() => setIsAuthOpen(true)} />}
              />
            </Routes>
          </Suspense>
          </ErrorBoundary>
        </div>

        <CookieConsentBanner />
      </div>
    </Router>
  )
}

export default App
