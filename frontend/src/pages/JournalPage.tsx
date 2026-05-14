import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios'
import AppConfirmDialog, { type AppConfirmState } from '../components/AppConfirmDialog'
import AppNotice, { type AppNoticeState } from '../components/AppNotice'
import PageSkeleton from '../components/PageSkeleton'
import type { User } from '../components/AuthModal'
import RouteWorkspaceNav from '../components/RouteWorkspaceNav'
import type { JournalEntryDTO } from '../types/journal'
import type { RouteResponseDTO } from '../types/route'

const MOOD_OPTIONS = ['calm', 'curious', 'energized', 'grateful', 'romantic', 'playful']
const JOURNAL_PROMPTS = [
  'What made today feel different from the plan?',
  'What place would you come back to without overthinking it?',
  'What tiny detail would you forget in two weeks if you did not write it down?',
]

function parseMediaInput(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export default function JournalPage({ currentUser }: { currentUser: User | null }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [route, setRoute] = useState<RouteResponseDTO | null>(null)
  const [entries, setEntries] = useState<JournalEntryDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<AppNoticeState | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<AppConfirmState | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [entryDate, setEntryDate] = useState('')
  const [title, setTitle] = useState('')
  const [story, setStory] = useState('')
  const [locationLabel, setLocationLabel] = useState('')
  const [mood, setMood] = useState(MOOD_OPTIONS[0])
  const [highlight, setHighlight] = useState('')
  const [favorite, setFavorite] = useState(false)
  const [mediaText, setMediaText] = useState('')

  const canEdit = Boolean(route?.canEdit && currentUser)

  const loadData = async () => {
    if (!id) return
    const [routeRes, entriesRes] = await Promise.all([
      api.get(`/routes/${id}`),
      api.get(`/routes/${id}/journal`),
    ])
    setRoute(routeRes.data)
    setEntries(entriesRes.data || [])
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false

    const bootstrap = async () => {
      try {
        const [routeRes, entriesRes] = await Promise.all([
          api.get(`/routes/${id}`),
          api.get(`/routes/${id}/journal`),
        ])

        if (cancelled) return
        setRoute(routeRes.data)
        setEntries(entriesRes.data || [])
      } catch {
        if (!cancelled) {
          navigate('/')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [id, navigate])

  const showNotice = (message: string, variant: AppNoticeState['variant'] = 'success') => {
    setNotice({ message, variant })
    window.setTimeout(() => setNotice(null), variant === 'error' ? 3600 : 2400)
  }

  const resetForm = () => {
    setEditingId(null)
    setEntryDate(route?.startDate || new Date().toISOString().slice(0, 10))
    setTitle('')
    setStory('')
    setLocationLabel('')
    setMood(MOOD_OPTIONS[0])
    setHighlight('')
    setFavorite(false)
    setMediaText('')
  }

  useEffect(() => {
    if (route && !entryDate) {
      setEntryDate(route.startDate || new Date().toISOString().slice(0, 10))
    }
  }, [entryDate, route])

  const highlights = useMemo(
    () => entries.filter((entry) => entry.favorite || entry.highlight).slice(0, 3),
    [entries]
  )

  const handleSubmit = async () => {
    if (!id || !canEdit) return
    if (!entryDate || !title.trim()) {
      showNotice('Add a date and a short title first so this memory has a clear anchor.', 'error')
      return
    }

    setSaving(true)
    try {
      const payload = {
        entryDate,
        title,
        story: story || undefined,
        locationLabel: locationLabel || undefined,
        mood: mood || undefined,
        highlight: highlight || undefined,
        favorite,
        mediaUrls: parseMediaInput(mediaText),
      }

      if (editingId) {
        await api.patch(`/journal/${editingId}`, payload)
        showNotice('Journal entry updated')
      } else {
        await api.post(`/routes/${id}/journal`, payload)
        showNotice('Memory saved')
      }

      await loadData()
      resetForm()
    } catch {
      showNotice('This memory could not be saved right now.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (entry: JournalEntryDTO) => {
    setEditingId(entry.id)
    setEntryDate(entry.entryDate)
    setTitle(entry.title)
    setStory(entry.story || '')
    setLocationLabel(entry.locationLabel || '')
    setMood(entry.mood || MOOD_OPTIONS[0])
    setHighlight(entry.highlight || '')
    setFavorite(entry.favorite)
    setMediaText((entry.mediaUrls || []).join('\n'))
  }

  const handleDelete = async (entryId: number) => {
    if (!canEdit) return
    setConfirmDialog({
      title: 'Remove this memory?',
      description: 'This journal entry will disappear from the trip timeline and highlights.',
      confirmLabel: 'Remove memory',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/journal/${entryId}`)
          await loadData()
          showNotice('Journal entry removed')
          if (editingId === entryId) {
            resetForm()
          }
        } catch {
          showNotice('This memory could not be removed right now.', 'error')
        }
      },
    })
  }

  if (loading) {
    return <PageSkeleton rows={4} />
  }

  if (!route || !id) return null

  return (
    <div className="app-shell flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => navigate(`/route/${id}`)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-white/12 dark:bg-black/26 dark:text-white/72"
          >
            Back to route
          </button>
        </div>

        <AppNotice notice={notice} onDismiss={() => setNotice(null)} />

        <RouteWorkspaceNav routeId={id} />

        <section className="glass-surface-strong rounded-[32px] p-6">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="text-[11px] uppercase tracking-[0.32em] text-teal-700 dark:text-cyan-100/72">Travel journal</div>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{route.name}</h1>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/48">
                Keep the human part of the trip, not just the logistics: small moments, photos, moods, and the things that made the day feel real.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 dark:border-white/[0.08] dark:bg-black/18">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Entries</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{entries.length}</div>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 dark:border-white/[0.08] dark:bg-black/18">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Highlights</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{highlights.length}</div>
              </div>
              <div className="rounded-[22px] border border-teal-500/16 bg-teal-50 px-4 py-3 dark:border-cyan-300/18 dark:bg-cyan-300/10">
                <div className="text-[10px] uppercase tracking-[0.18em] text-teal-700 dark:text-cyan-100/70">Trip window</div>
                <div className="mt-2 text-sm font-semibold text-teal-700 dark:text-cyan-100">{route.startDate && route.endDate ? `${route.startDate} to ${route.endDate}` : 'Dates still open'}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/18">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Best next step</div>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/48">
                Save the moments with emotional texture, not just the logistics. The useful memories are usually smaller than you think.
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/18">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Starter prompts</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {JOURNAL_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setStory((current) => (current ? `${current}\n\n${prompt}` : prompt))}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-[11px] text-slate-600 transition-all hover:border-slate-300 hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/64 dark:hover:border-white/14"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <section className="glass-surface rounded-[28px] p-5">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-teal-700 dark:text-cyan-100/72">{editingId ? 'Edit memory' : 'Add memory'}</div>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/48">
                One useful rule: write down what future-you would actually want to remember, not just what happened.
              </p>
            </div>

            {canEdit ? (
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white" />
                  <select value={mood} onChange={(event) => setMood(event.target.value)} className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white">
                    {MOOD_OPTIONS.map((option) => (
                      <option key={option} value={option} style={{ background: '#ffffff' }}>{option}</option>
                    ))}
                  </select>
                </div>
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Golden hour by the river" className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} placeholder="Location or neighborhood" className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white" />
                  <input value={highlight} onChange={(event) => setHighlight(event.target.value)} placeholder="Short highlight" className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white" />
                </div>
                <textarea value={story} onChange={(event) => setStory(event.target.value)} rows={6} placeholder="What made this moment worth remembering?" className="w-full resize-none rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white" />
                <textarea value={mediaText} onChange={(event) => setMediaText(event.target.value)} rows={3} placeholder="Photo URLs, one per line" className="w-full resize-none rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white" />
                <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-white/68">
                  <input type="checkbox" checked={favorite} onChange={(event) => setFavorite(event.target.checked)} />
                  Mark as a trip highlight
                </label>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => void handleSubmit()} disabled={saving} className="rounded-[20px] border border-teal-500/16 bg-teal-600 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-teal-500 disabled:opacity-40 dark:border-cyan-300/18 dark:bg-cyan-300/10 dark:text-cyan-100">
                    {saving ? 'Saving...' : editingId ? 'Update memory' : 'Save memory'}
                  </button>
                  {editingId ? (
                    <button onClick={resetForm} className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/68">
                      Cancel edit
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-[22px] border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-white/[0.12] dark:text-white/30">
                You can read the journal for this route, but only editors can add or revise memories.
              </div>
            )}
          </section>

          <section className="glass-surface rounded-[28px] p-5">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-teal-700 dark:text-cyan-100/72">Journal timeline</div>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/48">
                Ordered from the newest memory down so the most recent shape of the trip stays visible.
              </p>
            </div>

            <div className="mt-4 space-y-4">
              {entries.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 px-6 py-12 text-center dark:border-white/[0.12]">
                  <div className="text-sm font-medium text-slate-700 dark:text-white/72">No memories saved yet</div>
                  <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-white/34">
                    The first note does not need to be big. A neighborhood, a meal, a strange detail, or a mood is enough to start the story of the trip.
                  </p>
                </div>
              ) : (
                entries.map((entry) => (
                  <article key={entry.id} className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/16">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/42">{entry.entryDate}</span>
                          {entry.favorite ? <span className="rounded-full border border-teal-500/16 bg-teal-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-teal-700 dark:border-cyan-300/18 dark:bg-cyan-300/10 dark:text-cyan-100">Highlight</span> : null}
                          {entry.mood ? <span className="rounded-full border border-amber-300/24 bg-amber-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-700 dark:border-amber-300/16 dark:bg-amber-300/10 dark:text-amber-100/76">{entry.mood}</span> : null}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">{entry.title}</h3>
                        {entry.locationLabel ? <p className="mt-2 text-sm text-slate-500 dark:text-white/42">{entry.locationLabel}</p> : null}
                        {entry.highlight ? <p className="mt-3 text-sm font-medium text-teal-700 dark:text-cyan-100/80">{entry.highlight}</p> : null}
                        {entry.story ? <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-white/52">{entry.story}</p> : null}
                        {entry.mediaUrls?.length ? (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {entry.mediaUrls.map((url) => (
                              <div key={url} className="overflow-hidden rounded-[18px] border border-slate-200 bg-slate-100 dark:border-white/[0.08] dark:bg-black/20">
                                <img src={url} alt={entry.title} className="h-40 w-full object-cover" />
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      {canEdit ? (
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => handleEdit(entry)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/64">Edit</button>
                          <button onClick={() => void handleDelete(entry.id)} className="rounded-full border border-red-500/14 bg-red-50 px-3 py-1.5 text-[11px] text-red-600 dark:border-red-400/16 dark:bg-red-500/10 dark:text-red-200/70">Delete</button>
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <AppConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  )
}
