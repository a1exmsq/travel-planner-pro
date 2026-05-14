import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import api from '../api/axios'
import type { User } from './AuthModal'
import type { RouteCollectionDTO } from '../types/collection'

interface CollectionPickerProps {
  isOpen: boolean
  onClose: () => void
  routeId: number
  currentUser: User | null
}

export default function CollectionPicker({
  isOpen,
  onClose,
  routeId,
  currentUser,
}: CollectionPickerProps) {
  const [collections, setCollections] = useState<RouteCollectionDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')
  const [busyIds, setBusyIds] = useState<number[]>([])

  useEffect(() => {
    if (!isOpen || !currentUser) return
    setLoading(true)
    api.get('/collections/my')
      .then((response) => setCollections(response.data))
      .catch(() => setCollections([]))
      .finally(() => setLoading(false))
  }, [currentUser, isOpen])

  const collectionState = useMemo(
    () =>
      new Map(collections.map((collection) => [
        collection.id,
        collection.routes.some((route) => route.id === routeId),
      ])),
    [collections, routeId]
  )

  const toggleRoute = async (collectionId: number) => {
    const containsRoute = collectionState.get(collectionId)
    if (containsRoute === undefined || busyIds.includes(collectionId)) return

    setBusyIds((prev) => [...prev, collectionId])
    try {
      const response = containsRoute
        ? await api.delete(`/collections/${collectionId}/routes/${routeId}`)
        : await api.post(`/collections/${collectionId}/routes/${routeId}`)

      setCollections((prev) => prev.map((collection) => (
        collection.id === collectionId ? response.data : collection
      )))
      setMessage(containsRoute ? 'Removed from collection.' : 'Saved to collection.')
    } catch {
      setMessage('Could not update the collection.')
    } finally {
      setBusyIds((prev) => prev.filter((id) => id !== collectionId))
    }
  }

  const createCollection = async () => {
    if (!name.trim() || creating) return

    setCreating(true)
    try {
      const created = await api.post('/collections', {
        name: name.trim(),
        description: description.trim() || undefined,
      })

      const withRoute = await api.post(`/collections/${created.data.id}/routes/${routeId}`)
      setCollections((prev) => [withRoute.data, ...prev])
      setName('')
      setDescription('')
      setMessage('Collection created and route saved.')
    } catch {
      setMessage('Could not create collection.')
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen || !currentUser) return null

  return createPortal(
    <div className="fixed inset-0 z-[99998] flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="relative z-[99999] w-full max-w-2xl rounded-[32px] border border-white/[0.08] bg-[#0f1117] p-6 shadow-[0_32px_120px_rgba(0,0,0,0.55)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/72">Collections</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Save this route into your planning boards.</h2>
            <p className="mt-2 text-sm leading-7 text-white/46">
              Collections keep route ideas organized while you build future trips.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] text-white/46 transition-all hover:border-white/16 hover:text-white"
          >
            x
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            {loading ? (
              <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] px-5 py-8 text-center text-sm text-white/32">
                Loading collections...
              </div>
            ) : collections.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/[0.12] bg-white/[0.02] px-5 py-8 text-center text-sm text-white/32">
                No collections yet. Create the first one on the right.
              </div>
            ) : (
              collections.map((collection) => {
                const containsRoute = collectionState.get(collection.id)
                const busy = busyIds.includes(collection.id)

                return (
                  <div
                    key={collection.id}
                    className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{collection.name}</h3>
                        {collection.description && (
                          <p className="mt-2 text-sm leading-7 text-white/46">{collection.description}</p>
                        )}
                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/30">
                          {collection.routesCount} routes
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => void toggleRoute(collection.id)}
                        disabled={busy}
                        className={`rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                          containsRoute
                            ? 'border-cyan-300/24 bg-cyan-300/10 text-cyan-100'
                            : 'border-white/[0.08] bg-white/[0.03] text-white/68 hover:border-white/16 hover:text-white'
                        } disabled:opacity-40`}
                      >
                        {busy ? '...' : containsRoute ? 'Saved' : 'Save here'}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,_rgba(255,255,255,0.04)_0%,_rgba(255,255,255,0.015)_100%)] p-5">
            <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/72">New board</div>
            <h3 className="mt-2 text-xl font-semibold text-white">Create a fresh collection for this route.</h3>

            <div className="mt-4 space-y-3">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Collection name"
                className="w-full rounded-[20px] border border-white/[0.08] bg-black/18 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-cyan-300/35"
              />
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Short note about this trip board"
                rows={4}
                className="w-full resize-none rounded-[20px] border border-white/[0.08] bg-black/18 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-cyan-300/35"
              />
            </div>

            <button
              type="button"
              onClick={() => void createCollection()}
              disabled={!name.trim() || creating}
              className="mt-4 w-full rounded-[22px] border border-cyan-300/24 bg-cyan-300/10 px-4 py-3 text-sm font-medium text-cyan-100 transition-all hover:border-cyan-200/36 hover:bg-cyan-300/14 disabled:opacity-40"
            >
              {creating ? 'Creating...' : 'Create and save route'}
            </button>

            {message && <p className="mt-4 text-sm text-white/56">{message}</p>}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
