import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import api from '../api/axios'
import PageSkeleton from '../components/PageSkeleton'
import AppNotice, { type AppNoticeState } from '../components/AppNotice'
import type { User } from '../components/AuthModal'
import RouteWorkspaceNav from '../components/RouteWorkspaceNav'
import type { DayActivityDTO, RouteDayDTO } from '../types/itinerary'
import type { RouteResponseDTO } from '../types/route'

function formatMinutes(totalMinutes?: number) {
  if (!totalMinutes || totalMinutes <= 0) return '0 min'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (!hours) return `${minutes} min`
  if (!minutes) return `${hours}h`
  return `${hours}h ${minutes}m`
}

function money(value?: number, currency?: string | null) {
  return `${(value ?? 0).toFixed(0)} ${currency || 'USD'}`
}

function tripWindow(route: RouteResponseDTO | null) {
  if (!route?.startDate || !route?.endDate) return 'Set trip dates in route edit'
  return `${route.startDate} to ${route.endDate}`
}

function SortableActivityCard({
  activity,
  index,
  canEdit,
  onTimeChange,
  onTimeBlur,
  onDurationChange,
  onDurationBlur,
}: {
  activity: DayActivityDTO
  index: number
  canEdit: boolean
  onTimeChange: (activityId: number, nextValue: string) => void
  onTimeBlur: (activityId: number) => void
  onDurationChange: (activityId: number, nextValue: number) => void
  onDurationBlur: (activityId: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
    disabled: !canEdit,
  })

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-[24px] border p-4 transition-all ${
        isDragging
          ? 'border-teal-500/24 bg-teal-50 shadow-[0_20px_45px_rgba(15,23,42,0.08)] dark:border-cyan-300/24 dark:bg-cyan-300/10'
          : 'border-slate-200 bg-white dark:border-white/[0.08] dark:bg-black/16'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            {...attributes}
            {...listeners}
            disabled={!canEdit}
            className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold ${
              canEdit
                ? 'cursor-grab bg-slate-900 text-white dark:bg-cyan-500 dark:text-[#06202a]'
                : 'cursor-default bg-slate-200 text-slate-700 dark:bg-white/[0.08] dark:text-white'
            }`}
          >
            {index + 1}
          </button>

          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-teal-700 dark:text-cyan-100/68">
              {activity.activityType}
            </div>
            <h3 className="mt-1 text-base font-medium text-slate-900 dark:text-white">{activity.name}</h3>
            {activity.notes ? <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/46">{activity.notes}</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/64">
            <span className="mr-2">Start</span>
            <input
              type="time"
              disabled={!canEdit}
              value={activity.startTime || '09:00'}
              onChange={(event) => onTimeChange(activity.id, event.target.value)}
              onBlur={() => onTimeBlur(activity.id)}
              className="bg-transparent outline-none"
            />
          </label>
          <label className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/64">
            <span className="mr-2">Stay</span>
            <input
              type="number"
              min={0}
              max={480}
              disabled={!canEdit}
              value={activity.durationMinutes}
              onChange={(event) => onDurationChange(activity.id, parseInt(event.target.value, 10) || 0)}
              onBlur={() => onDurationBlur(activity.id)}
              className="w-12 bg-transparent text-center outline-none"
            />
            <span className="ml-1">min</span>
          </label>
        </div>
      </div>
    </article>
  )
}

export default function ItineraryPage({ currentUser }: { currentUser: User | null }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [route, setRoute] = useState<RouteResponseDTO | null>(null)
  const [days, setDays] = useState<RouteDayDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [planning, setPlanning] = useState(false)
  const [notice, setNotice] = useState<AppNoticeState | null>(null)
  const [savingDayId, setSavingDayId] = useState<number | null>(null)
  const [savingActivityId, setSavingActivityId] = useState<number | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const loadItinerary = async () => {
    if (!id) return
    const [routeResponse, itineraryResponse] = await Promise.all([
      api.get(`/routes/${id}`),
      api.get(`/routes/${id}/itinerary`),
    ])
    setRoute(routeResponse.data)
    setDays(itineraryResponse.data || [])
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false

    const bootstrap = async () => {
      try {
        const [routeResponse, itineraryResponse] = await Promise.all([
          api.get(`/routes/${id}`),
          api.get(`/routes/${id}/itinerary`),
        ])

        if (cancelled) return
        setRoute(routeResponse.data)
        setDays(itineraryResponse.data || [])
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

  const canEdit = Boolean(route?.canEdit && currentUser)
  const canAutoPlan = Boolean(route?.startDate && route?.endDate && canEdit)
  const totalActivities = useMemo(
    () => days.reduce((sum, day) => sum + (day.activityCount ?? day.activities.length), 0),
    [days]
  )

  const showNotice = (message: string, variant: AppNoticeState['variant'] = 'success') => {
    setNotice({ message, variant })
    window.setTimeout(() => setNotice(null), variant === 'error' ? 3600 : 2400)
  }

  const handleAutoPlan = async () => {
    if (!id || !canAutoPlan) return
    setPlanning(true)
    try {
      const response = await api.post(`/routes/${id}/auto-plan`)
      setDays(response.data || [])
      showNotice('Itinerary auto-planned')
    } catch (error: unknown) {
      const responseMessage = typeof error === 'object' && error !== null && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined
      showNotice(responseMessage || 'The itinerary could not be auto-planned yet.', 'error')
    } finally {
      setPlanning(false)
    }
  }

  const handleDayFieldChange = (dayId: number, field: 'title' | 'notes', value: string) => {
    setDays((prev) => prev.map((day) => (day.id === dayId ? { ...day, [field]: value } : day)))
  }

  const saveDay = async (day: RouteDayDTO) => {
    if (!canEdit) return
    setSavingDayId(day.id)
    try {
      const response = await api.put(`/days/${day.id}`, {
        title: day.title,
        notes: day.notes,
      })
      setDays((prev) => prev.map((item) => (item.id === day.id ? response.data : item)))
      showNotice(`Day ${day.dayNumber} updated`)
    } catch {
      showNotice('This day could not be updated right now.', 'error')
    } finally {
      setSavingDayId(null)
    }
  }

  const handleActivityFieldChange = (
    dayId: number,
    activityId: number,
    field: 'startTime' | 'durationMinutes',
    value: string | number
  ) => {
    setDays((prev) =>
      prev.map((day) => (
        day.id === dayId
          ? {
              ...day,
              activities: day.activities.map((activity) => (
                activity.id === activityId ? { ...activity, [field]: value } : activity
              )),
            }
          : day
      ))
    )
  }

  const saveActivity = async (dayId: number, activityId: number) => {
    const day = days.find((entry) => entry.id === dayId)
    const activity = day?.activities.find((entry) => entry.id === activityId)
    if (!canEdit || !activity) return

    setSavingActivityId(activityId)
    try {
      const response = await api.put(`/activities/${activityId}`, {
        startTime: activity.startTime,
        durationMinutes: activity.durationMinutes,
      })
      setDays((prev) =>
        prev.map((entry) => (
          entry.id === dayId
            ? {
                ...entry,
                activities: entry.activities.map((item) => (item.id === activityId ? response.data : item)),
              }
            : entry
        ))
      )
      showNotice('Activity updated')
    } catch {
      showNotice('This activity could not be updated right now.', 'error')
    } finally {
      setSavingActivityId(null)
    }
  }

  const handleDragEnd = async (dayId: number, event: DragEndEvent) => {
    if (!canEdit) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const day = days.find((entry) => entry.id === dayId)
    if (!day) return

    const oldIndex = day.activities.findIndex((activity) => activity.id === active.id)
    const newIndex = day.activities.findIndex((activity) => activity.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const reordered = arrayMove(day.activities, oldIndex, newIndex).map((activity, index) => ({
      ...activity,
      orderIndex: index + 1,
    }))

    setDays((prev) => prev.map((entry) => (entry.id === dayId ? { ...entry, activities: reordered } : entry)))
    try {
      await Promise.all(
        reordered.map((activity, index) =>
          api.put(`/activities/${activity.id}`, {
            orderIndex: index + 1,
            startTime: activity.startTime,
            durationMinutes: activity.durationMinutes,
          })
        )
      )
      showNotice(`Day ${day.dayNumber} reordered`)
      await loadItinerary()
    } catch {
      showNotice('These activities could not be reordered right now.', 'error')
      await loadItinerary()
    }
  }

  if (loading) {
    return <PageSkeleton rows={4} />
  }

  if (!route) return null

  return (
    <div className="app-shell flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => navigate(`/route/${id}`)}
            className="inline-flex items-center gap-2 text-xs text-slate-500 transition-colors hover:text-slate-800 dark:text-white/46 dark:hover:text-white/78"
          >
            <span>&lt;</span>
            Back to route
          </button>
        </div>

        <AppNotice notice={notice} onDismiss={() => setNotice(null)} />

        <RouteWorkspaceNav routeId={id!} className="mb-6" />

        <section className="glass-surface-strong rounded-[32px] p-6">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="text-[11px] uppercase tracking-[0.32em] text-teal-700 dark:text-cyan-100/72">Itinerary</div>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{route.name}</h1>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/46">
                {route.numberOfDays ? `${route.numberOfDays} planned day${route.numberOfDays === 1 ? '' : 's'}` : 'No dates locked in yet'} / {totalActivities} activities
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-white/[0.08] dark:bg-black/18 dark:text-white/72">
                {tripWindow(route)}
              </div>
              <button
                onClick={() => navigate(`/route/${id}/budget`)}
                className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/72 dark:hover:border-white/16 dark:hover:bg-white/[0.06]"
              >
                Open budget
              </button>
              {canEdit ? (
                <button
                  onClick={handleAutoPlan}
                  disabled={!canAutoPlan || planning}
                  className="rounded-[22px] border border-teal-500/16 bg-teal-600 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-teal-500 disabled:opacity-30 dark:border-cyan-300/24 dark:bg-cyan-300/10 dark:text-cyan-100 dark:hover:border-cyan-200/36 dark:hover:bg-cyan-300/14"
                >
                  {planning ? 'Planning...' : 'Auto-plan my trip'}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/18">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Best next step</div>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/48">
                Shape the fixed anchors first: arrival, must-see places, and the moments that need specific timing.
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/18">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Planner note</div>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/48">
                Leave some air in each day. Routes feel better when there is room for one surprise stop or one slower meal.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/18">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Trip length</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{route.numberOfDays || 0} days</div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/18">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Activities</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{totalActivities}</div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/18">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Distance</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{route.totalDistanceKm ?? 0} km</div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/18">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Budget</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{money(route.totalBudget, route.currency)}</div>
            </div>
          </div>
        </section>

        {!canAutoPlan && canEdit ? (
          <div className="mt-4 rounded-[24px] border border-amber-300/40 bg-amber-50 px-5 py-4 text-sm text-amber-700 dark:border-amber-300/16 dark:bg-amber-300/8 dark:text-amber-100/78">
            Add `startDate` and `endDate` in the route editor before using auto-plan.
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {days.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/72 px-6 py-12 text-center dark:border-white/[0.12] dark:bg-[#0f1117]">
              <div className="text-sm font-medium text-slate-700 dark:text-white/72">No day plan yet</div>
              <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-white/36">
                Start by setting trip dates, then either auto-plan the route or shape the days from the route editor.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => navigate(`/route/${id}/edit`)}
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/72"
                >
                  Open route editor
                </button>
                {canEdit ? (
                  <button
                    onClick={handleAutoPlan}
                    disabled={!canAutoPlan || planning}
                    className="rounded-[18px] border border-teal-500/16 bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-teal-500 disabled:opacity-40 dark:border-cyan-300/24 dark:bg-cyan-300/10 dark:text-cyan-100"
                  >
                    {planning ? 'Planning...' : 'Auto-plan'}
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            days.map((day) => (
              <section key={day.id} className="glass-surface rounded-[28px] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] uppercase tracking-[0.28em] text-teal-700 dark:text-cyan-100/72">
                      Day {day.dayNumber}
                    </div>
                    <input
                      value={day.title || ''}
                      disabled={!canEdit}
                      onChange={(event) => handleDayFieldChange(day.id, 'title', event.target.value)}
                      onBlur={() => saveDay(day)}
                      placeholder={`Day ${day.dayNumber}`}
                      className="mt-2 w-full bg-transparent text-xl font-semibold text-slate-900 outline-none dark:text-white"
                    />
                    {day.date ? <p className="mt-1 text-sm text-slate-500 dark:text-white/44">{day.date}</p> : null}
                    <textarea
                      value={day.notes || ''}
                      disabled={!canEdit}
                      onChange={(event) => handleDayFieldChange(day.id, 'notes', event.target.value)}
                      onBlur={() => saveDay(day)}
                      rows={2}
                      placeholder="What is the vibe of this day?"
                      className="mt-3 w-full resize-none rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-teal-500/30 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                    />
                    {savingDayId === day.id ? <div className="mt-2 text-xs text-teal-700 dark:text-cyan-100/68">Saving day details...</div> : null}
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-center dark:border-white/[0.08] dark:bg-black/18">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Activities</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{day.activityCount ?? day.activities.length}</div>
                    </div>
                    <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-center dark:border-white/[0.08] dark:bg-black/18">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Distance</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{day.totalDistanceKm ?? 0} km</div>
                    </div>
                    <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-center dark:border-white/[0.08] dark:bg-black/18">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Time</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{formatMinutes(day.totalDurationMinutes)}</div>
                    </div>
                    <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-center dark:border-white/[0.08] dark:bg-black/18">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Budget</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{money(day.totalBudget, route.currency)}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {day.activities.length === 0 ? (
                    <div className="rounded-[20px] border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/[0.12] dark:text-white/28">
                      This day is still open. Add the anchor moments first, then fill the quieter gaps around them.
                    </div>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void handleDragEnd(day.id, event)}>
                      <SortableContext items={day.activities.map((activity) => activity.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3">
                          {day.activities.map((activity, index) => (
                            <div key={activity.id}>
                              <SortableActivityCard
                                activity={activity}
                                index={index}
                                canEdit={canEdit}
                                onTimeChange={(activityId, nextValue) => handleActivityFieldChange(day.id, activityId, 'startTime', nextValue)}
                                onTimeBlur={(activityId) => void saveActivity(day.id, activityId)}
                                onDurationChange={(activityId, nextValue) => handleActivityFieldChange(day.id, activityId, 'durationMinutes', nextValue)}
                                onDurationBlur={(activityId) => void saveActivity(day.id, activityId)}
                              />
                              {savingActivityId === activity.id ? (
                                <div className="mt-2 text-xs text-teal-700 dark:text-cyan-100/68">Saving activity...</div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
