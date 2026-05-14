import { useState, type KeyboardEvent } from 'react'
import { formatVibeTag } from '../utils/routeMeta'

const SUGGESTED_VIBE_TAGS = [
  'food',
  'architecture',
  'sunset',
  'hidden-gems',
  'coffee',
  'museum',
  'night-walk',
  'road-trip',
]

interface VibeTagFieldProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

function normalizeTag(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export default function VibeTagField({ tags, onChange }: VibeTagFieldProps) {
  const [draft, setDraft] = useState('')

  const addTag = (value: string) => {
    const normalized = normalizeTag(value)
    if (!normalized || tags.includes(normalized) || tags.length >= 8) return
    onChange([...tags, normalized])
    setDraft('')
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter((current) => current !== tag))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag(draft)
    }
  }

  return (
    <section className="rounded-[26px] border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="text-[11px] uppercase tracking-[0.24em] text-white/28">Route vibe</div>
      <p className="mt-2 text-xs leading-6 text-white/40">
        Add a few atmosphere tags so people can discover routes by feeling, not only by title.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add tag and press Enter"
          className="w-full rounded-[20px] border border-white/[0.08] bg-black/18 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-cyan-300/35"
        />
        <button
          type="button"
          onClick={() => addTag(draft)}
          className="rounded-[20px] border border-cyan-300/22 bg-cyan-300/10 px-4 py-3 text-xs font-medium text-cyan-100 transition-all hover:border-cyan-200/36 hover:bg-cyan-300/14"
        >
          Add
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full border border-cyan-300/24 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100 transition-all hover:border-red-400/28 hover:bg-red-500/10 hover:text-red-200"
            >
              {formatVibeTag(tag)} x
            </button>
          ))
        ) : (
          <span className="text-xs text-white/30">No vibe tags yet.</span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTED_VIBE_TAGS.filter((tag) => !tags.includes(tag)).map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => addTag(tag)}
            className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] text-white/62 transition-all hover:border-white/16 hover:text-white"
          >
            {formatVibeTag(tag)}
          </button>
        ))}
      </div>
    </section>
  )
}
