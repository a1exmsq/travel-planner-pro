import { useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import api from '../api/axios'

export interface User {
  id: number
  username: string
  email: string
  points: number
  role: string
}

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onLoginSuccess: (userData: User | { token?: string; user?: User }) => void
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register'
      const payload = isLogin ? { email, password } : { email, username, password }
      const response = await api.post(endpoint, payload)
      onLoginSuccess(response.data)
      onClose()
    } catch (err: unknown) {
      const responseMessage = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined

      setError(responseMessage || 'We could not sign you in right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close sign-in modal"
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="app-panel-strong relative z-10 w-full max-w-[440px] overflow-hidden p-0">
        <div className="border-b border-slate-200/70 px-6 py-5 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="app-button app-button-subtle absolute right-4 top-4 h-10 w-10 min-h-0 px-0"
            aria-label="Close"
          >
            x
          </button>

          <div className="app-kicker">{isLogin ? 'Welcome back' : 'Create account'}</div>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
            {isLogin ? 'Pick up your next trip' : 'Start planning without the overwhelm'}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/54">
            {isLogin
              ? 'Sign in to keep your routes, collections, hidden places, and shared plans in sync.'
              : 'Create an account to save routes, collaborate with friends, and keep your travel ideas together.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          {!isLogin ? (
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-white/36">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="traveler_name"
                className="app-input"
              />
            </div>
          ) : null}

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-white/36">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="app-input"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-white/36">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="app-input"
            />
          </div>

          {error ? (
            <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/18 dark:bg-red-500/10 dark:text-red-100/86">
              {error}
            </div>
          ) : null}

          <button type="submit" disabled={loading} className="app-button app-button-primary w-full rounded-[20px]">
            {loading ? 'Working...' : isLogin ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="border-t border-slate-200/70 px-6 py-4 text-center dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => {
              setIsLogin((value) => !value)
              setError('')
            }}
            className="text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-white/48 dark:hover:text-white/82"
          >
            {isLogin ? 'Need an account? Create one' : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
