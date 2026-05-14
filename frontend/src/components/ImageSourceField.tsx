import { useId, useState, type ChangeEvent } from 'react'
import { compressImageFile, formatBytes } from '../utils/imageUpload'

interface ImageSourceFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  helperText?: string
  dark?: boolean
}

export default function ImageSourceField({
  label,
  value,
  onChange,
  placeholder = 'Paste an image URL',
  helperText,
  dark = false,
}: ImageSourceFieldProps) {
  const inputId = useId()
  const [isUploading, setIsUploading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const fieldClasses = dark
    ? 'w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-cyan-300/40'
    : 'app-input'

  const panelClasses = dark
    ? 'rounded-[22px] border border-white/[0.08] bg-black/18 p-3'
    : 'rounded-[22px] border border-slate-200 bg-white/80 p-3 dark:border-white/[0.08] dark:bg-black/18'

  const mutedClasses = dark ? 'text-white/40' : 'text-slate-500 dark:text-white/40'
  const smallMutedClasses = dark ? 'text-white/30' : 'text-slate-500 dark:text-white/34'
  const isUploadedImage = value.startsWith('data:image/')

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    setIsUploading(true)
    setError('')
    setStatus('')

    try {
      const result = await compressImageFile(file)
      onChange(result.dataUrl)
      setStatus(
        `Compressed to ${formatBytes(result.compressedBytes)} from ${formatBytes(result.originalBytes)} at ${result.width}x${result.height}.`
      )
    } catch {
      setError('We could not prepare this image yet.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={inputId} className={`mb-2 block text-[11px] uppercase tracking-[0.18em] ${smallMutedClasses}`}>
          {label}
        </label>
        <input
          id={inputId}
          value={isUploadedImage ? '' : value}
          onChange={(event) => {
            onChange(event.target.value)
            setError('')
            setStatus('')
          }}
          placeholder={isUploadedImage ? 'Uploaded image is already attached' : placeholder}
          className={fieldClasses}
        />
      </div>

      <div className={panelClasses}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className={`text-xs font-medium ${dark ? 'text-white/78' : 'text-slate-700 dark:text-white/78'}`}>
              Upload your own image
            </div>
            <p className={`mt-1 text-xs leading-6 ${mutedClasses}`}>
              JPG, PNG, or WebP. We compress it before saving so the file stays lighter without looking rough.
            </p>
          </div>

          <label
            className={`inline-flex cursor-pointer items-center justify-center rounded-full border px-4 py-2 text-xs font-medium transition-all ${
              dark
                ? 'border-cyan-300/24 bg-cyan-300/10 text-cyan-100 hover:border-cyan-200/40 hover:bg-cyan-300/14'
                : 'border-teal-500/18 bg-teal-50 text-teal-700 hover:border-teal-500/28 hover:bg-teal-100 dark:border-cyan-300/24 dark:bg-cyan-300/10 dark:text-cyan-100'
            }`}
          >
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} />
            {isUploading ? 'Compressing...' : 'Upload image'}
          </label>
        </div>

        {helperText ? <p className={`mt-3 text-[11px] leading-6 ${mutedClasses}`}>{helperText}</p> : null}
        {status ? <p className="mt-3 text-[11px] leading-6 text-emerald-600 dark:text-emerald-200/88">{status}</p> : null}
        {error ? <p className="mt-3 text-[11px] leading-6 text-rose-500 dark:text-rose-200/90">{error}</p> : null}

        {value ? (
          <div className="mt-3 overflow-hidden rounded-[18px] border border-black/5 bg-black/6 dark:border-white/[0.08] dark:bg-white/[0.04]">
            <div className="aspect-[16/9] overflow-hidden">
              <img src={value} alt="Selected preview" className="h-full w-full object-cover" />
            </div>
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <p className={`truncate text-[11px] ${mutedClasses}`}>
                {value.startsWith('data:image/') ? 'Uploaded image ready to save' : value}
              </p>
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setStatus('')
                  setError('')
                }}
                className={`rounded-full border px-3 py-1 text-[11px] transition-all ${
                  dark
                    ? 'border-white/[0.08] bg-white/[0.03] text-white/68 hover:border-white/16 hover:text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/68 dark:hover:border-white/16 dark:hover:text-white'
                }`}
              >
                Remove
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}