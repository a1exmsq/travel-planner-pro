import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios'
import AppConfirmDialog, { type AppConfirmState } from '../components/AppConfirmDialog'
import AppNotice, { type AppNoticeState } from '../components/AppNotice'
import type { User } from '../components/AuthModal'
import RouteWorkspaceNav from '../components/RouteWorkspaceNav'
import type { BudgetSummaryDTO, RouteExpenseDTO } from '../types/budget'
import type { RouteResponseDTO } from '../types/route'

const EXPENSE_CATEGORIES = [
  'TRANSPORT',
  'FOOD',
  'ACCOMMODATION',
  'TICKETS',
  'SHOPPING',
  'OTHER',
] as const

function money(value?: number | null, currency?: string | null) {
  const amount = value ?? 0
  return `${amount.toFixed(2)} ${currency || 'USD'}`
}

export default function BudgetPage({ currentUser }: { currentUser: User | null }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [route, setRoute] = useState<RouteResponseDTO | null>(null)
  const [expenses, setExpenses] = useState<RouteExpenseDTO[]>([])
  const [summary, setSummary] = useState<BudgetSummaryDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<AppNoticeState | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<AppConfirmState | null>(null)
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null)

  const [category, setCategory] = useState<typeof EXPENSE_CATEGORIES[number]>('TRANSPORT')
  const [name, setName] = useState('')
  const [plannedAmount, setPlannedAmount] = useState('')
  const [actualAmount, setActualAmount] = useState('')
  const [date, setDate] = useState('')
  const [routePoiId, setRoutePoiId] = useState('')
  const [isPaid, setIsPaid] = useState(false)
  const [notes, setNotes] = useState('')

  const canEdit = Boolean(route?.canEdit && currentUser)

  const resetExpenseForm = () => {
    setEditingExpenseId(null)
    setCategory('TRANSPORT')
    setName('')
    setPlannedAmount('')
    setActualAmount('')
    setDate('')
    setRoutePoiId('')
    setIsPaid(false)
    setNotes('')
  }

  const loadBudget = async () => {
    if (!id) return
    const [routeRes, expensesRes, summaryRes] = await Promise.all([
      api.get(`/routes/${id}`),
      api.get(`/routes/${id}/budget`),
      api.get(`/routes/${id}/budget/summary`),
    ])
    setRoute(routeRes.data)
    setExpenses(expensesRes.data || [])
    setSummary(summaryRes.data)
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false

    const bootstrap = async () => {
      try {
        const [routeRes, expensesRes, summaryRes] = await Promise.all([
          api.get(`/routes/${id}`),
          api.get(`/routes/${id}/budget`),
          api.get(`/routes/${id}/budget/summary`),
        ])

        if (cancelled) return
        setRoute(routeRes.data)
        setExpenses(expensesRes.data || [])
        setSummary(summaryRes.data)
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
    window.setTimeout(() => setNotice(null), variant === 'error' ? 3600 : 2200)
  }

  const handleSubmitExpense = async () => {
    if (!id || !canEdit) return
    if (!name.trim() || !plannedAmount) {
      showNotice('Add a short name and planned amount so this cost has enough context.', 'error')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        category,
        name,
        plannedAmount: Number(plannedAmount),
        actualAmount: actualAmount ? Number(actualAmount) : undefined,
        currency: summary?.currency || route?.currency || undefined,
        date: date || undefined,
        routePoiId: routePoiId ? Number(routePoiId) : undefined,
        isPaid,
        notes: notes || undefined,
      }

      if (editingExpenseId) {
        await api.put(`/expenses/${editingExpenseId}`, payload)
      } else {
        await api.post(`/routes/${id}/expenses`, payload)
      }

      resetExpenseForm()
      await loadBudget()
      showNotice(editingExpenseId ? 'Expense updated' : 'Expense added')
    } catch {
      showNotice(editingExpenseId ? 'This expense could not be updated right now.' : 'This expense could not be added right now.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditExpense = (expense: RouteExpenseDTO) => {
    setEditingExpenseId(expense.id)
    setCategory((expense.category as typeof EXPENSE_CATEGORIES[number]) || 'OTHER')
    setName(expense.name || '')
    setPlannedAmount(expense.plannedAmount != null ? String(expense.plannedAmount) : '')
    setActualAmount(expense.actualAmount != null ? String(expense.actualAmount) : '')
    setDate(expense.date || '')
    setRoutePoiId(expense.routePoiId != null ? String(expense.routePoiId) : '')
    setIsPaid(Boolean(expense.isPaid))
    setNotes(expense.notes || '')
  }

  const handleTogglePaid = async (expense: RouteExpenseDTO) => {
    if (!canEdit) return
    try {
      await api.put(`/expenses/${expense.id}`, {
        isPaid: !expense.isPaid,
      })
      await loadBudget()
      showNotice('Expense updated')
    } catch {
      showNotice('This expense could not be updated right now.', 'error')
    }
  }

  const handleDeleteExpense = async (expenseId: number) => {
    if (!canEdit) return
    setConfirmDialog({
      title: 'Remove this expense?',
      description: 'This cost will disappear from the route budget and category breakdown.',
      confirmLabel: 'Remove expense',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/expenses/${expenseId}`)
          if (editingExpenseId === expenseId) {
            resetExpenseForm()
          }
          await loadBudget()
          showNotice('Expense removed')
        } catch {
          showNotice('This expense could not be removed right now.', 'error')
        }
      },
    })
  }

  const spentRatio = useMemo(() => {
    if (!summary || !summary.totalBudget || summary.totalBudget <= 0) return 0
    return Math.min(100, (summary.totalActual / summary.totalBudget) * 100)
  }, [summary])

  if (loading) {
    return (
      <div className="app-shell flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="h-8 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-white/[0.06]" />
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-[28px] border border-slate-200 bg-white dark:border-white/[0.06] dark:bg-white/[0.02]" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-[28px] border border-slate-200 bg-white dark:border-white/[0.06] dark:bg-white/[0.02]" />
        </div>
      </div>
    )
  }

  if (!route || !summary) return null

  return (
    <div className="app-shell flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => navigate(`/route/${id}`)} className="app-back-link">
            <span>&lt;</span>
            Back to route
          </button>
        </div>

        <AppNotice notice={notice} onDismiss={() => setNotice(null)} />

        <RouteWorkspaceNav routeId={id!} />

        <section className="app-panel-strong p-6">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="app-kicker">Budget tracker</div>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{route.name}</h1>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/46">
                Planned spending, actual costs, and the route-level picture in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => navigate(`/route/${id}/edit`)} className="app-button app-button-secondary">
                Edit route
              </button>
              <button onClick={() => navigate(`/route/${id}/itinerary`)} className="app-button app-button-primary">
                Open itinerary
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="app-card p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Best next step</div>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/48">
                Start with transport, stay, and tickets first. Once the fixed costs are in, the rest of the route budget gets much easier to trust.
              </p>
            </div>
            <div className="app-card p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Budget rhythm</div>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/48">
                Planned costs keep the trip realistic. Actual costs keep it honest once the route starts moving.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="app-card p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Budget</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{money(summary.totalBudget, summary.currency)}</div>
            </div>
            <div className="app-card p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Planned</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{money(summary.totalPlanned, summary.currency)}</div>
            </div>
            <div className="app-card p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Actual</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{money(summary.totalActual, summary.currency)}</div>
            </div>
            <div className="app-card p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Remaining</div>
              <div className={`mt-2 text-2xl font-semibold ${summary.remaining < 0 ? 'text-red-600 dark:text-red-200' : 'text-slate-900 dark:text-white'}`}>
                {money(summary.remaining, summary.currency)}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-white/42">
              <span>Budget usage</span>
              <span>{spentRatio.toFixed(0)}%</span>
            </div>
            <div className="app-progress-track">
              <div
                className={`app-progress-bar ${summary.remaining < 0 ? '!bg-red-500 dark:!bg-red-400' : ''}`}
                style={{ width: `${spentRatio}%` }}
              />
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section className="space-y-6">
            {canEdit ? (
              <section className="app-panel p-5">
                <div className="mb-4">
                  <div className="app-kicker">{editingExpenseId ? 'Edit expense' : 'Add expense'}</div>
                  <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/46">
                    Link costs to stops, add dates, and keep the trip grounded in real spending.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[11px] text-slate-500 dark:text-white/34">Category</label>
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value as typeof EXPENSE_CATEGORIES[number])}
                      className="app-select"
                    >
                      {EXPENSE_CATEGORIES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] text-slate-500 dark:text-white/34">Route stop</label>
                    <select value={routePoiId} onChange={(event) => setRoutePoiId(event.target.value)} className="app-select">
                      <option value="">Not linked</option>
                      {(route.stops || []).map((stop) => (
                        <option key={stop.routePoiId} value={stop.routePoiId}>
                          {stop.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="mb-1.5 block text-[11px] text-slate-500 dark:text-white/34">Expense name</label>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Train to city center"
                    className="app-input"
                  />
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] text-slate-500 dark:text-white/34">Planned</label>
                    <input type="number" min={0} step="0.01" value={plannedAmount} onChange={(event) => setPlannedAmount(event.target.value)} className="app-input" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] text-slate-500 dark:text-white/34">Actual</label>
                    <input type="number" min={0} step="0.01" value={actualAmount} onChange={(event) => setActualAmount(event.target.value)} className="app-input" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] text-slate-500 dark:text-white/34">Date</label>
                    <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="app-input" />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="mb-1.5 block text-[11px] text-slate-500 dark:text-white/34">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    placeholder="Optional context"
                    className="app-textarea"
                  />
                </div>

                <label className="mt-4 flex items-center gap-3 text-sm text-slate-700 dark:text-white/68">
                  <input type="checkbox" checked={isPaid} onChange={(event) => setIsPaid(event.target.checked)} className="h-4 w-4" />
                  Mark as already paid
                </label>

                <div className="mt-4 flex gap-3">
                  <button onClick={handleSubmitExpense} disabled={submitting} className="app-button app-button-primary w-full rounded-[20px]">
                    {submitting ? (editingExpenseId ? 'Saving changes...' : 'Saving expense...') : (editingExpenseId ? 'Save changes' : 'Add expense')}
                  </button>
                  {editingExpenseId ? (
                    <button onClick={resetExpenseForm} type="button" className="app-button app-button-secondary rounded-[20px]">
                      Cancel
                    </button>
                  ) : null}
                </div>
              </section>
            ) : (
              <section className="app-panel p-5">
                <div className="app-kicker">Read-only</div>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-white/50">
                  You can review the budget for this route, but only editors can add or change costs.
                </p>
              </section>
            )}

            <section className="app-panel p-5">
              <div className="app-kicker">Category breakdown</div>
              <div className="mt-4 space-y-3">
                {summary.categories.length === 0 ? (
                  <div className="app-empty-state px-4 py-8 text-center text-sm">
                    Add the first expense and the category picture will start to organize itself here.
                  </div>
                ) : (
                  summary.categories.map((item) => {
                    const max = summary.totalActual > 0 ? (item.actual / summary.totalActual) * 100 : 0
                    return (
                      <div key={item.category} className="app-card p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-white">{item.category}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-white/42">
                              Planned {money(item.planned, summary.currency)} / Actual {money(item.actual, summary.currency)}
                            </div>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-white/46">{max.toFixed(0)}%</div>
                        </div>
                        <div className="mt-3 app-progress-track">
                          <div className="app-progress-bar" style={{ width: `${max}%` }} />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </section>
          </section>

          <section className="app-panel p-5">
            <div>
              <div className="app-kicker">Expenses</div>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/46">
                {expenses.length} item{expenses.length === 1 ? '' : 's'} tracked for this route.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {expenses.length === 0 ? (
                <div className="app-empty-state px-4 py-10 text-center text-sm">
                  No expenses tracked yet. Start with the costs that would change the trip if they were off.
                </div>
              ) : (
                expenses.map((expense) => (
                  <article key={expense.id} className="app-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-medium text-slate-900 dark:text-white">{expense.name}</h3>
                          <span className="app-pill">{expense.category}</span>
                          {expense.isPaid ? <span className="app-pill app-pill-accent">Paid</span> : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-white/42">
                          <span>Planned {money(expense.plannedAmount, expense.currency || summary.currency)}</span>
                          <span>Actual {money(expense.actualAmount ?? expense.plannedAmount, expense.currency || summary.currency)}</span>
                          {expense.date ? <span>{expense.date}</span> : null}
                          {expense.routePoiName ? <span>{expense.routePoiName}</span> : null}
                        </div>
                        {expense.notes ? <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-white/46">{expense.notes}</p> : null}
                      </div>

                      {canEdit ? (
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => handleEditExpense(expense)} className="app-button app-button-secondary">
                            Edit
                          </button>
                          <button onClick={() => void handleTogglePaid(expense)} className="app-button app-button-primary">
                            {expense.isPaid ? 'Mark unpaid' : 'Mark paid'}
                          </button>
                          <button onClick={() => void handleDeleteExpense(expense.id)} className="app-button app-button-danger">
                            Delete
                          </button>
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
