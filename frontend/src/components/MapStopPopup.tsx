import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

interface MapStopPopupProps {
  screenX: number
  screenY: number
  onConfirm: (name: string) => void
  onCancel: () => void
}

const quickStopNames = [
  'Coffee stop',
  'Photo spot',
  'Viewpoint break',
  'Hidden corner',
]

export default function MapStopPopup({ screenX, screenY, onConfirm, onCancel }: MapStopPopupProps) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleConfirm = () => {
    if (name.trim()) {
      onConfirm(name.trim())
    }
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') handleConfirm()
    if (event.key === 'Escape') onCancel()
  }

  const isMobile = window.innerWidth < 640
  const popupWidth = Math.min(320, window.innerWidth - 32)
  const left = Math.max(16, Math.min(screenX - popupWidth / 2, window.innerWidth - popupWidth - 16))
  const top = screenY - 176 < 12 ? screenY + 16 : screenY - 176

  return (
    <>
      <div className="fixed inset-0 z-[500]" onClick={onCancel} />
      <div
        className="fixed z-[501] overflow-hidden rounded-[28px] border border-white/[0.12] bg-[linear-gradient(180deg,_#11151d_0%,_#0f1117_100%)] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.45)]"
        style={
          isMobile
            ? { left: 16, right: 16, bottom: 'max(16px, env(safe-area-inset-bottom))' }
            : { left, top, width: popupWidth }
        }
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_60%)]" />

        <div className="relative">
          {isMobile && <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-white/12" />}
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/72">New stop</div>
          <p className="mt-2 text-sm leading-7 text-white/42">
            Give this point a name and add it to the route timeline.
          </p>

          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Name this stop"
            maxLength={60}
            className="mt-4 w-full rounded-[22px] border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-cyan-300/40"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {quickStopNames.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setName(item)}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/60 transition-all hover:border-white/18 hover:text-white/84"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={!name.trim()}
              className="flex-1 rounded-[22px] bg-cyan-500 py-3 text-sm font-semibold text-[#06202a] transition-all hover:bg-cyan-400 disabled:opacity-30"
            >
              Add stop
            </button>
            <button
              onClick={onCancel}
              className="rounded-[22px] bg-white/[0.06] px-4 text-sm text-white/52 transition-all hover:bg-white/[0.1] hover:text-white/80"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
