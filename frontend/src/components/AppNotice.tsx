export type AppNoticeVariant = 'success' | 'error' | 'info'

export interface AppNoticeState {
  message: string
  variant?: AppNoticeVariant
}

export default function AppNotice({
  notice,
  onDismiss,
}: {
  notice: AppNoticeState | null
  onDismiss?: () => void
}) {
  if (!notice) return null

  const variant = notice.variant || 'info'
  const title = variant === 'error'
    ? 'Something needs attention'
    : variant === 'success'
      ? 'Saved'
      : 'Update'

  return (
    <div className={`app-notice app-notice-${variant}`}>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-[0.18em] opacity-75">{title}</div>
        <p className="mt-1 text-sm leading-6">{notice.message}</p>
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full border border-current/10 px-3 py-1 text-[11px] font-medium opacity-70 transition-opacity hover:opacity-100"
        >
          Close
        </button>
      ) : null}
    </div>
  )
}
