interface PageSkeletonProps {
  rows?: number
  hasHero?: boolean
}

export default function PageSkeleton({ rows = 3, hasHero = false }: PageSkeletonProps) {
  return (
    <div className="app-shell flex-1 overflow-y-auto">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {hasHero && (
          <div className="h-[280px] animate-pulse rounded-[34px] border border-slate-200 bg-white dark:border-white/[0.06] dark:bg-white/[0.02]" />
        )}
        <div className="h-8 w-32 animate-pulse rounded-full bg-slate-200 dark:bg-white/[0.06]" />
        <div className="space-y-4">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-[28px] border border-slate-200 bg-white dark:border-white/[0.06] dark:bg-white/[0.02]"
              style={{ height: `${i === 0 ? 120 : 80}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
