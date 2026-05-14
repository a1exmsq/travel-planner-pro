import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios'
import AppConfirmDialog, { type AppConfirmState } from '../components/AppConfirmDialog'
import AppNotice, { type AppNoticeState } from '../components/AppNotice'
import PageSkeleton from '../components/PageSkeleton'
import type { User } from '../components/AuthModal'
import RouteWorkspaceNav from '../components/RouteWorkspaceNav'
import type { PackingItemDTO } from '../types/packing'
import type { RouteResponseDTO } from '../types/route'

const PACKING_CATEGORIES = [
  'essentials',
  'documents',
  'clothes',
  'tech',
  'comfort',
  'health',
  'extras',
] as const

export default function PackingPage({ currentUser }: { currentUser: User | null }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [route, setRoute] = useState<RouteResponseDTO | null>(null)
  const [items, setItems] = useState<PackingItemDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<AppNoticeState | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<AppConfirmState | null>(null)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<(typeof PACKING_CATEGORIES)[number]>('essentials')
  const [quantity, setQuantity] = useState('1')
  const [requiredFor, setRequiredFor] = useState('')
  const [notes, setNotes] = useState('')

  const canEdit = Boolean(route?.canEdit && currentUser)

  const loadData = async () => {
    if (!id) return
    const [routeRes, itemsRes] = await Promise.all([
      api.get(`/routes/${id}`),
      api.get(`/routes/${id}/packing`),
    ])
    setRoute(routeRes.data)
    setItems(itemsRes.data || [])
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false

    const bootstrap = async () => {
      try {
        const [routeRes, itemsRes] = await Promise.all([
          api.get(`/routes/${id}`),
          api.get(`/routes/${id}/packing`),
        ])

        if (cancelled) return
        setRoute(routeRes.data)
        setItems(itemsRes.data || [])
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

  const sortedItems = useMemo(
    () => [...items].sort((left, right) => left.orderIndex - right.orderIndex),
    [items]
  )

  const packedCount = useMemo(
    () => sortedItems.filter((item) => item.packed).length,
    [sortedItems]
  )

  const completion = sortedItems.length > 0 ? Math.round((packedCount / sortedItems.length) * 100) : 0

  const groupedItems = useMemo(() => {
    const groups = new Map<string, PackingItemDTO[]>()
    for (const item of sortedItems) {
      const key = item.category || 'essentials'
      const bucket = groups.get(key) || []
      bucket.push(item)
      groups.set(key, bucket)
    }
    return Array.from(groups.entries())
  }, [sortedItems])

  const handleCreateItem = async () => {
    if (!id || !canEdit) return
    if (!title.trim()) {
      showNotice('Add a short item title first so the checklist stays easy to scan.', 'error')
      return
    }

    setSaving(true)
    try {
      await api.post(`/routes/${id}/packing`, {
        title,
        category,
        quantity: Number(quantity) || 1,
        requiredFor: requiredFor || undefined,
        notes: notes || undefined,
      })
      setTitle('')
      setCategory('essentials')
      setQuantity('1')
      setRequiredFor('')
      setNotes('')
      await loadData()
      showNotice('Checklist item added')
    } catch {
      showNotice('This checklist item could not be saved right now.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePacked = async (item: PackingItemDTO) => {
    if (!canEdit) return
    try {
      await api.patch(`/packing/${item.id}`, {
        packed: !item.packed,
      })
      setItems((prev) => prev.map((entry) => (
        entry.id === item.id ? { ...entry, packed: !entry.packed } : entry
      )))
      showNotice(item.packed ? 'Moved back to unpacked' : 'Marked as packed')
    } catch {
      showNotice('This checklist item could not be updated right now.', 'error')
    }
  }

  const handleDelete = async (itemId: number) => {
    if (!canEdit) return
    setConfirmDialog({
      title: 'Remove this checklist item?',
      description: 'This item will disappear from the packing list and progress totals.',
      confirmLabel: 'Remove item',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/packing/${itemId}`)
          await loadData()
          showNotice('Checklist item removed')
        } catch {
          showNotice('This checklist item could not be removed right now.', 'error')
        }
      },
    })
  }

  const handleMove = async (itemId: number, direction: -1 | 1) => {
    if (!id || !canEdit) return
    const currentIndex = sortedItems.findIndex((item) => item.id === itemId)
    const nextIndex = currentIndex + direction
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= sortedItems.length) return

    const reordered = [...sortedItems]
    const [moved] = reordered.splice(currentIndex, 1)
    reordered.splice(nextIndex, 0, moved)

    setItems(reordered.map((item, index) => ({ ...item, orderIndex: index + 1 })))

    try {
      const response = await api.patch(`/routes/${id}/packing/reorder`, {
        orderedIds: reordered.map((item) => item.id),
      })
      setItems(response.data || [])
    } catch {
      await loadData()
      showNotice('The checklist could not be reordered right now.', 'error')
    }
  }

  if (loading) {
    return <PageSkeleton rows={5} />
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
              <div className="text-[11px] uppercase tracking-[0.32em] text-teal-700 dark:text-cyan-100/72">Packing checklist</div>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{route.name}</h1>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/48">
                Keep the prep work calm: important things first, comfort items later, and nothing essential forgotten.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-white/[0.08] dark:bg-black/18 dark:text-white/70">
                {packedCount} of {sortedItems.length} packed
              </div>
              <div className="rounded-[22px] border border-teal-500/16 bg-teal-50 px-4 py-3 text-sm text-teal-700 dark:border-cyan-300/18 dark:bg-cyan-300/10 dark:text-cyan-100">
                {completion}% ready
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/18">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Best next step</div>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/48">
                Add the failure-points first: passport, wallet, tickets, medication, chargers, and the first-night essentials.
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/18">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Calm packing rule</div>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/48">
                If an item is only useful once, note what day it matters for. That makes the list feel more curated and less noisy.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/18">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Checklist</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{sortedItems.length}</div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/18">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Packed</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{packedCount}</div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/18">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Still open</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{Math.max(0, sortedItems.length - packedCount)}</div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/18">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Trip window</div>
              <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{route.startDate && route.endDate ? `${route.startDate} to ${route.endDate}` : 'Dates still flexible'}</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-white/42">
              <span>Prep progress</span>
              <span>{completion}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/[0.06]">
              <div className="h-full rounded-full bg-teal-600 dark:bg-cyan-400" style={{ width: `${completion}%` }} />
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          {canEdit ? (
            <section className="glass-surface rounded-[28px] p-5">
              <div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-teal-700 dark:text-cyan-100/72">Add item</div>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/48">
                  Add the things that tend to get forgotten first: documents, chargers, layers, medicine, comfort basics.
                </p>
              </div>

              <div className="mt-4 space-y-3">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Passport, adapters, rain jacket..."
                  className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
                />
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px]">
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value as (typeof PACKING_CATEGORIES)[number])}
                    className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
                  >
                    {PACKING_CATEGORIES.map((option) => (
                      <option key={option} value={option} style={{ background: '#ffffff' }}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <input
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    type="number"
                    min={1}
                    max={99}
                    className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
                    placeholder="Qty"
                  />
                </div>
                <input
                  value={requiredFor}
                  onChange={(event) => setRequiredFor(event.target.value)}
                  placeholder="Required for: flights, hiking day, first night..."
                  className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
                />
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Optional reminder or context"
                  className="w-full resize-none rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
                />
                <button
                  onClick={() => void handleCreateItem()}
                  disabled={saving}
                  className="w-full rounded-[20px] border border-teal-500/16 bg-teal-600 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-teal-500 disabled:opacity-40 dark:border-cyan-300/18 dark:bg-cyan-300/10 dark:text-cyan-100"
                >
                  {saving ? 'Saving item...' : 'Add to checklist'}
                </button>
              </div>
            </section>
          ) : (
            <section className="glass-surface rounded-[28px] p-5">
              <div className="text-[11px] uppercase tracking-[0.28em] text-teal-700 dark:text-cyan-100/72">Checklist notes</div>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-white/50">
                You can review the checklist for this trip, but only editors can change what gets packed.
              </p>
            </section>
          )}

          <section className="glass-surface rounded-[28px] p-5">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-teal-700 dark:text-cyan-100/72">Checklist</div>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/48">
                Grouped by category so it feels closer to real trip prep and less like a raw todo list.
              </p>
            </div>

            <div className="mt-4 space-y-5">
              {groupedItems.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500 dark:border-white/[0.12] dark:text-white/30">
                  Nothing on the checklist yet. Start with the things that would make the trip harder on day one if they were missing.
                </div>
              ) : (
                groupedItems.map(([group, entries]) => (
                  <section key={group} className="space-y-3">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-white/26">{group}</div>
                    {entries.map((item) => (
                      <article key={item.id} className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/16">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => void handleTogglePacked(item)}
                                disabled={!canEdit}
                                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-all ${
                                  item.packed
                                    ? 'border-emerald-400/30 bg-emerald-50 text-emerald-700 dark:border-emerald-300/22 dark:bg-emerald-300/10 dark:text-emerald-100'
                                    : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-white/46'
                                }`}
                              >
                                {item.packed ? 'OK' : item.quantity}
                              </button>
                              <h3 className="text-base font-medium text-slate-900 dark:text-white">{item.title}</h3>
                              {item.requiredFor ? (
                                <span className="rounded-full border border-teal-500/14 bg-teal-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-teal-700 dark:border-cyan-300/16 dark:bg-cyan-300/10 dark:text-cyan-100">
                                  {item.requiredFor}
                                </span>
                              ) : null}
                            </div>
                            {item.notes ? <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-white/50">{item.notes}</p> : null}
                          </div>

                          {canEdit ? (
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => void handleMove(item.id, -1)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/64">Up</button>
                              <button onClick={() => void handleMove(item.id, 1)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/64">Down</button>
                              <button onClick={() => void handleDelete(item.id)} className="rounded-full border border-red-500/14 bg-red-50 px-3 py-1.5 text-[11px] text-red-600 dark:border-red-400/16 dark:bg-red-500/10 dark:text-red-200/70">Remove</button>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </section>
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
