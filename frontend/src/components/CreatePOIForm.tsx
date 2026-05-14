import { useState, type FormEvent } from 'react'
import api from '../api/axios'
import AppNotice, { type AppNoticeState } from './AppNotice'
import ImageSourceField from './ImageSourceField'

interface Props {
  onClose: () => void
  onSuccess: (savedName: string) => void
  coords: { lat: number; lng: number }
  userId: number
}

const categories = [
  { value: 'Secret Place', label: 'Secret place' },
  { value: 'Cafe', label: 'Cafe' },
  { value: 'Viewpoint', label: 'Viewpoint' },
  { value: 'Street Art', label: 'Street art' },
]

const presets = [
  {
    name: 'Rooftop sunset spot',
    category: 'Viewpoint',
    description: 'A quiet view point with the best light near the end of the day.',
  },
  {
    name: 'Hidden courtyard cafe',
    category: 'Cafe',
    description: 'Small local stop that feels easy to miss from the main street.',
  },
  {
    name: 'Quiet local corner',
    category: 'Secret Place',
    description: 'A personal stop worth remembering when the route needs something less obvious.',
  },
  {
    name: 'Street art wall',
    category: 'Street Art',
    description: 'A visual stop that gives the route more character and a better photo moment.',
  },
]

function truncateCopy(value: string | undefined, maxLength = 110) {
  if (!value) return null
  const normalized = value.trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trimEnd()}...`
}

export default function CreatePOIForm({ onClose, onSuccess, coords, userId }: Props) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Secret Place')
  const [description, setDescription] = useState('')
  const [mainImageUrl, setMainImageUrl] = useState('')
  const [address, setAddress] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notice, setNotice] = useState<AppNoticeState | null>(null)
  const selectedPreset = presets.find((preset) => preset.name === name) ?? null

  const showNotice = (message: string, variant: AppNoticeState['variant'] = 'info') => {
    setNotice({ message, variant })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      await api.post(`/pois?userId=${userId}`, {
        name,
        category,
        description,
        latitude: coords.lat,
        longitude: coords.lng,
        mainImageUrl: mainImageUrl || undefined,
        imageUrl: mainImageUrl || undefined,
        address: address || undefined,
      })
      onSuccess(name)
    } catch {
      showNotice('We could not save this place yet.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative max-h-[85vh] overflow-y-auto rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,_#11151d_0%,_#0f1117_100%)] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.45)] sm:p-6">
      <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_60%)]" />

      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-xl text-sm leading-none text-white/30 transition-all hover:bg-white/[0.06] hover:text-white/70"
      >
        x
      </button>

      <div className="relative mb-5">
        <div className="inline-flex items-center rounded-full border border-[#8b5cf6]/30 bg-[#8b5cf6]/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-[#d8b4fe]">
          Hidden place
        </div>
        <h2 className="mt-4 text-lg font-semibold text-white">Save a place only you know</h2>
        <p className="mt-1 text-sm leading-7 text-white/42">
          It will show up on your map and can later become part of a route.
        </p>
        <p className="mt-2 text-xs text-white/28">
          {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AppNotice notice={notice} onDismiss={() => setNotice(null)} />

        <div className="rounded-[22px] border border-white/[0.08] bg-black/18 p-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/28">What makes a good hidden place</div>
          <p className="mt-2 text-sm leading-7 text-white/54">
            Save the stops that make a route feel personal: a better photo angle, a slower cafe, a view that fixes the pacing of the day.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {['Specific name', 'One clear reason', 'Easy to remember later'].map((item) => (
              <span key={item} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/58">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-white/34">Quick presets</label>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  setName(preset.name)
                  setCategory(preset.category)
                  setDescription((current) => current || preset.description)
                }}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/62 transition-all hover:border-white/18 hover:text-white/84"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {selectedPreset && (
          <div className="rounded-[22px] border border-cyan-300/18 bg-cyan-300/10 px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/78">Preset direction</div>
            <p className="mt-2 text-sm leading-7 text-cyan-50/90">{truncateCopy(selectedPreset.description, 140)}</p>
          </div>
        )}

        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-white/34">Place name</label>
          <input
            required
            placeholder="Rooftop view, hidden courtyard, local cafe..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-cyan-300/40"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-white/34">Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => {
              const active = category === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setCategory(item.value)}
                  className={`rounded-full border px-3 py-2 text-xs transition-all ${
                    active
                      ? 'border-cyan-300/28 bg-cyan-300/12 text-cyan-100'
                      : 'border-white/[0.08] bg-white/[0.03] text-white/48 hover:border-white/16 hover:text-white/75'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-white/34">What makes it special?</label>
          <textarea
            placeholder="Tell future you why this place matters."
            className="h-24 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-cyan-300/40"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ImageSourceField
            label="Place photo"
            value={mainImageUrl}
            onChange={setMainImageUrl}
            placeholder="Optional cover image URL"
            helperText="You can still paste a link, but uploading your own image now works too."
            dark
          />
          <div>
            <label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-white/34">Address note</label>
            <input
              placeholder="Optional address or area"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-cyan-300/40"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </div>
        </div>

        <div className="rounded-[22px] border border-white/[0.08] bg-black/18 px-4 py-2.5 text-xs leading-6 text-white/42">
          Private by default. It stays in your own layer until you choose to include it in a route.
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-[#06202a] transition-all hover:bg-cyan-400 disabled:opacity-40"
        >
          {isSubmitting ? 'Saving hidden place...' : 'Save hidden place'}
        </button>
      </form>
    </div>
  )
}
