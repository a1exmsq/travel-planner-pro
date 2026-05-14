export interface AppConfirmState {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void | Promise<void>
}

export default function AppConfirmDialog({
  dialog,
  onClose,
}: {
  dialog: AppConfirmState | null
  onClose: () => void
}) {
  if (!dialog) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px] dark:bg-black/55"
      />

      <div className="glass-surface-strong relative z-[1] w-full max-w-[460px] rounded-[30px] p-6">
        <div className="text-[11px] uppercase tracking-[0.26em] text-teal-700 dark:text-cyan-100/72">
          Confirm action
        </div>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{dialog.title}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-white/48">{dialog.description}</p>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} className="app-button app-button-secondary">
            {dialog.cancelLabel || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => {
              void dialog.onConfirm()
              onClose()
            }}
            className={`app-button ${dialog.danger ? 'app-button-danger' : 'app-button-primary'}`}
          >
            {dialog.confirmLabel || 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
