import { NavLink } from 'react-router-dom'

const baseLinkClass =
  'rounded-full border px-4 py-2 text-xs font-medium transition-all'

export default function RouteWorkspaceNav({
  routeId,
  className = '',
}: {
  routeId: string | number
  className?: string
}) {
  const items = [
    { to: `/route/${routeId}`, label: 'Route' },
    { to: `/route/${routeId}/edit`, label: 'Edit' },
    { to: `/route/${routeId}/itinerary`, label: 'Itinerary' },
    { to: `/route/${routeId}/budget`, label: 'Budget' },
    { to: `/route/${routeId}/packing`, label: 'Packing' },
    { to: `/route/${routeId}/journal`, label: 'Journal' },
  ]

  return (
    <div className={`overflow-x-auto pb-1 ${className}`}>
      <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/28">
        <span>Route workspace</span>
        <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-white/18" />
        <span>Move between planning layers</span>
      </div>
      <nav className="flex min-w-max gap-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === `/route/${routeId}`}
            className={({ isActive }) =>
              `${baseLinkClass} ${
                isActive
                  ? 'border-teal-500/20 bg-teal-50 text-teal-700 dark:border-cyan-300/32 dark:bg-cyan-300/12 dark:text-cyan-100'
                  : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/48 dark:hover:border-white/20 dark:hover:text-white/80'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
