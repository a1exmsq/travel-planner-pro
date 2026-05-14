import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

// ── Types ────────────────────────────────────────────────────────────────

interface AiStop {
  poiId: number
  poiName: string
  category: string
  imageUrl?: string
  latitude?: number
  longitude?: number
  address?: string
  note: string
  visitMinutes: number
  orderInDay: number
}

interface AiDay {
  dayNumber: number
  theme: string
  description: string
  stops: AiStop[]
}

interface AiRouteResult {
  title: string
  description: string
  cityId: number
  cityName: string
  totalDays: number
  days: AiDay[]
  aiGenerated: boolean
}

interface Props {
  cityId: number
  cityName: string
  onClose: () => void
}

// ── Constants ─────────────────────────────────────────────────────────────

const INTERESTS = [
  { id: 'history',   label: 'History',   emoji: '🏛️' },
  { id: 'food',      label: 'Food',      emoji: '🍽️' },
  { id: 'nature',    label: 'Nature',    emoji: '🌿' },
  { id: 'art',       label: 'Art',       emoji: '🎨' },
  { id: 'nightlife', label: 'Nightlife', emoji: '🍺' },
  { id: 'sport',     label: 'Sport',     emoji: '⚽' },
  { id: 'religion',  label: 'Religion',  emoji: '⛪' },
]

const PACE_OPTIONS = [
  { id: 'relaxed', label: 'Relaxed',  hint: '~4 stops/day, plenty of breaks',  icon: '🌅' },
  { id: 'normal',  label: 'Balanced', hint: '~6 stops/day, comfortable pace',   icon: '🗺️' },
  { id: 'intense', label: 'Packed',   hint: '~8 stops/day, see everything',     icon: '⚡' },
]

const LOADING_MESSAGES = [
  'Scanning city places…',
  'Building your itinerary…',
  'Optimising stop order…',
  'Adding visit tips…',
]

const CATEGORY_EMOJI: Record<string, string> = {
  Landmark: '🏛️', Museum: '🖼️', Restaurant: '🍽️', Cafe: '☕',
  Bar: '🍺', Park: '🌳', Viewpoint: '🔭', Religious: '⛪',
  Culture: '🎭', Market: '🛒', Sport: '⚽',
}

// ── Component ─────────────────────────────────────────────────────────────

export default function AiRouteModal({ cityId, cityName, onClose }: Props) {
  const navigate = useNavigate()

  // form
  const [days, setDays] = useState(2)
  const [interests, setInterests] = useState<string[]>([])
  const [pace, setPace] = useState('normal')

  // flow
  const [phase, setPhase] = useState<'form' | 'loading' | 'result' | 'saving'>('form')
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0])
  const [result, setResult] = useState<AiRouteResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedDay, setExpandedDay] = useState<number | null>(1)

  const msgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (phase !== 'loading') return
    let i = 0
    msgTimerRef.current = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length
      setLoadingMsg(LOADING_MESSAGES[i])
    }, 2500)
    return () => {
      if (msgTimerRef.current) clearInterval(msgTimerRef.current)
    }
  }, [phase])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function toggleInterest(id: string) {
    setInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  async function handleGenerate() {
    setError(null)
    setPhase('loading')
    setLoadingMsg(LOADING_MESSAGES[0])
    try {
      const res = await api.post<AiRouteResult>('/ai/generate-route', {
        cityId,
        days,
        interests,
        pace,
      })
      setResult(res.data)
      setExpandedDay(1)
      setPhase('result')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Generation failed. Make sure the city has places imported first.'
      setError(msg)
      setPhase('form')
    }
  }

  async function handleSave() {
    if (!result) return
    setPhase('saving')
    try {
      const routeRes = await api.post<{ id: number }>('/routes', {
        name: result.title,
        description: result.description,
        isPublic: false,
        routeType: 'CITY',
        primaryCityId: result.cityId,
        locationSummary: result.cityName,
      })
      const routeId = routeRes.data.id

      for (const day of result.days) {
        for (const stop of day.stops) {
          await api.post(`/routes/${routeId}/stops`, {
            poiId: stop.poiId,
            travelTimeMinutes: 15,
          })
        }
      }

      navigate(`/route/${routeId}`)
      onClose()
    } catch {
      setError('Failed to save route. Please try again.')
      setPhase('result')
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────

  const totalStops = result?.days.reduce((sum, d) => sum + d.stops.length, 0) ?? 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative z-10 flex w-full flex-col rounded-t-[32px] sm:rounded-[32px] border border-white/[0.08] bg-[#0b1220] shadow-2xl sm:max-w-2xl max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/20 text-lg">✨</div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.26em] text-violet-300/70">AI Route Generator</div>
              <div className="mt-0.5 text-base font-semibold text-white">{cityName}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] text-white/40 transition-colors hover:border-white/16 hover:text-white/70"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── FORM ── */}
          {(phase === 'form' || phase === 'loading') && (
            <div className="space-y-6 p-6">

              {/* Error */}
              {error && (
                <div className="rounded-[16px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {/* Days */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/36 mb-3">
                  Duration — {days} day{days > 1 ? 's' : ''}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5, 6, 7].map(d => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      disabled={phase === 'loading'}
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all ${
                        days === d
                          ? 'bg-violet-500 text-white shadow-[0_0_16px_rgba(139,92,246,0.4)]'
                          : 'border border-white/[0.08] bg-white/[0.04] text-white/60 hover:border-white/16 hover:text-white/80'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interests */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/36 mb-3">
                  Interests {interests.length === 0 && <span className="normal-case text-white/24">(any)</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map(item => (
                    <button
                      key={item.id}
                      onClick={() => toggleInterest(item.id)}
                      disabled={phase === 'loading'}
                      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-all ${
                        interests.includes(item.id)
                          ? 'border border-violet-400/40 bg-violet-500/18 text-violet-200'
                          : 'border border-white/[0.08] bg-white/[0.04] text-white/60 hover:border-white/16 hover:text-white/80'
                      }`}
                    >
                      <span>{item.emoji}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pace */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/36 mb-3">Pace</div>
                <div className="grid grid-cols-3 gap-2">
                  {PACE_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setPace(opt.id)}
                      disabled={phase === 'loading'}
                      className={`rounded-[20px] border px-3 py-3 text-left transition-all ${
                        pace === opt.id
                          ? 'border-violet-400/40 bg-violet-500/14 text-white'
                          : 'border-white/[0.08] bg-white/[0.04] text-white/60 hover:border-white/16 hover:text-white/80'
                      }`}
                    >
                      <div className="text-xl">{opt.icon}</div>
                      <div className="mt-2 text-sm font-medium">{opt.label}</div>
                      <div className="mt-0.5 text-[11px] leading-5 opacity-60">{opt.hint}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── LOADING ── */}
          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-5 px-6 pb-10 pt-4">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <svg className="absolute inset-0 h-full w-full animate-spin text-violet-400/60" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round" />
                </svg>
                <span className="text-2xl">✨</span>
              </div>
              <div className="text-sm text-white/60">{loadingMsg}</div>
              <div className="text-[11px] text-white/28">This may take up to 15 seconds</div>
            </div>
          )}

          {/* ── RESULT ── */}
          {(phase === 'result' || phase === 'saving') && result && (
            <div className="space-y-4 p-6">
              {/* Route header */}
              <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.03] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-violet-300/70">
                      {result.aiGenerated ? (
                        <>✨ <span>AI Generated</span></>
                      ) : (
                        <>🗺️ <span>Smart Selection</span></>
                      )}
                    </div>
                    <h3 className="mt-2 text-xl font-semibold text-white">{result.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-white/52">{result.description}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-white/52">
                    {result.totalDays} day{result.totalDays > 1 ? 's' : ''}
                  </span>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-white/52">
                    {totalStops} stops
                  </span>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-white/52">
                    {result.cityName}
                  </span>
                </div>
              </div>

              {/* Error banner if save failed */}
              {error && (
                <div className="rounded-[16px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {/* Days */}
              {result.days.map(day => (
                <div
                  key={day.dayNumber}
                  className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] overflow-hidden"
                >
                  {/* Day header — click to expand */}
                  <button
                    onClick={() => setExpandedDay(expandedDay === day.dayNumber ? null : day.dayNumber)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm font-semibold text-violet-300">
                        {day.dayNumber}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{day.theme}</div>
                        <div className="text-[11px] text-white/40">{day.stops.length} stops</div>
                      </div>
                    </div>
                    <svg
                      className={`h-4 w-4 flex-shrink-0 text-white/30 transition-transform ${expandedDay === day.dayNumber ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Stops list */}
                  {expandedDay === day.dayNumber && (
                    <div className="border-t border-white/[0.04] divide-y divide-white/[0.04]">
                      {day.stops.map((stop, si) => (
                        <div key={stop.poiId} className="flex gap-3 px-5 py-3">
                          {/* Number */}
                          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] text-white/40 mt-0.5">
                            {si + 1}
                          </div>

                          {/* Image */}
                          {stop.imageUrl && (
                            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-[12px] bg-white/[0.06]">
                              <img
                                src={stop.imageUrl}
                                alt={stop.poiName}
                                className="h-full w-full object-cover"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                              />
                            </div>
                          )}

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-medium text-white leading-snug">{stop.poiName}</span>
                              <span className="text-xs text-white/30">
                                {CATEGORY_EMOJI[stop.category] ?? '📍'} {stop.category}
                              </span>
                            </div>
                            {stop.note && (
                              <p className="mt-1 text-xs leading-5 text-white/44">{stop.note}</p>
                            )}
                            <div className="mt-1 text-[11px] text-white/28">~{stop.visitMinutes} min</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-white/[0.06] px-6 py-4">
          {phase === 'form' && (
            <button
              onClick={() => void handleGenerate()}
              className="w-full rounded-full bg-violet-600 py-3 text-sm font-medium text-white shadow-[0_0_20px_rgba(139,92,246,0.35)] transition-all hover:bg-violet-500 hover:shadow-[0_0_28px_rgba(139,92,246,0.5)] active:scale-[0.98]"
            >
              ✨ Generate Route
            </button>
          )}

          {phase === 'loading' && (
            <button
              disabled
              className="w-full rounded-full bg-violet-600/40 py-3 text-sm font-medium text-white/50 cursor-not-allowed"
            >
              Generating…
            </button>
          )}

          {phase === 'result' && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => { setPhase('form'); setResult(null); setError(null) }}
                className="flex-1 rounded-full border border-white/[0.08] bg-white/[0.04] py-3 text-sm text-white/60 transition-all hover:border-white/16 hover:text-white/80"
              >
                ↩ Regenerate
              </button>
              <button
                onClick={() => void handleSave()}
                className="flex-1 rounded-full bg-violet-600 py-3 text-sm font-medium text-white shadow-[0_0_20px_rgba(139,92,246,0.35)] transition-all hover:bg-violet-500 hover:shadow-[0_0_28px_rgba(139,92,246,0.5)] active:scale-[0.98]"
              >
                Save as Draft Route →
              </button>
            </div>
          )}

          {phase === 'saving' && (
            <button
              disabled
              className="w-full rounded-full bg-violet-600/40 py-3 text-sm font-medium text-white/50 cursor-not-allowed"
            >
              Saving route…
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
