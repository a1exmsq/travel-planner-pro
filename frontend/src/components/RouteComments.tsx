import { useEffect, useState } from 'react'
import api from '../api/axios'
import AppConfirmDialog, { type AppConfirmState } from './AppConfirmDialog'
import AppNotice, { type AppNoticeState } from './AppNotice'
import type { User } from './AuthModal'

interface CommentDTO {
  id: number
  text: string
  authorUsername: string
  createdAt: string
}

interface RouteCommentsProps {
  routeId: number
  currentUser: User | null
  routeAuthorUsername: string
  onLoginRequest: () => void
}

export default function RouteComments({
  routeId,
  currentUser,
  routeAuthorUsername,
  onLoginRequest,
}: RouteCommentsProps) {
  const [comments, setComments] = useState<CommentDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [notice, setNotice] = useState<AppNoticeState | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<AppConfirmState | null>(null)
  const starterPrompts = [
    'Best time of day for this route?',
    'Any stop you would swap out?',
    'Where should the route slow down?',
  ]

  useEffect(() => {
    let cancelled = false

    api.get(`/routes/${routeId}/comments`)
      .then((res) => {
        if (!cancelled) setComments(res.data || [])
      })
      .catch(() => {
        if (!cancelled) setComments([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [routeId])

  const refreshComments = async () => {
    const response = await api.get(`/routes/${routeId}/comments`)
    setComments(response.data || [])
  }

  const showNotice = (message: string, variant: AppNoticeState['variant'] = 'info') => {
    setNotice({ message, variant })
  }

  const handlePost = async () => {
    if (!currentUser) {
      onLoginRequest()
      return
    }
    if (!text.trim() || posting) return

    setPosting(true)
    try {
      await api.post(`/routes/${routeId}/comment`, text.trim(), {
        headers: { 'Content-Type': 'text/plain' },
      })
      setText('')
      await refreshComments()
    } catch {
      showNotice('We could not post this comment yet.', 'error')
    } finally {
      setPosting(false)
    }
  }

  const handleDelete = async (commentId: number) => {
    setConfirmDialog({
      title: 'Remove this comment?',
      description: 'This note will disappear from the route discussion for everyone.',
      confirmLabel: 'Remove comment',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/routes/comments/${commentId}`)
          setComments((prev) => prev.filter((comment) => comment.id !== commentId))
        } catch {
          showNotice('We could not remove this comment right now.', 'error')
        }
      },
    })
  }

  const canDelete = (comment: CommentDTO) => (
    currentUser && (
      comment.authorUsername === currentUser.username ||
      routeAuthorUsername === currentUser.username
    )
  )

  const formatDate = (iso: string) => {
    const date = new Date(iso)
    return `${date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <div className="p-5">
      <AppNotice notice={notice} onDismiss={() => setNotice(null)} />

      <h3 className="text-[10px] uppercase tracking-[0.28em] text-slate-400 dark:text-white/34">
        Discussion {comments.length > 0 ? `/ ${comments.length}` : ''}
      </h3>

      <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/46">
        Use comments for small travel notes, timing advice, or quick route improvements rather than long discussion threads.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void handlePost()
            }
          }}
          placeholder={currentUser ? 'Add a quick note, tip, or travel thought' : 'Sign in to join the discussion'}
          maxLength={500}
          disabled={!currentUser}
          className="app-input flex-1"
        />
        <button onClick={() => void handlePost()} disabled={!text.trim() || posting || !currentUser} className="app-button app-button-primary h-[50px] rounded-[18px] px-4">
          {posting ? '...' : 'Send'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {starterPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => setText(prompt)}
            disabled={!currentUser}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 transition-all hover:border-slate-300 hover:text-slate-900 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/58 dark:hover:border-white/16 dark:hover:text-white"
          >
            {prompt}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-4 text-center text-xs text-slate-500 dark:text-white/24">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="mt-4 rounded-[20px] border border-dashed border-slate-300 px-4 py-6 text-center dark:border-white/[0.12]">
          <p className="text-sm text-slate-600 dark:text-white/42">No comments yet.</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-white/30">
            The best first comment is usually something small and useful, not a big review.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="group flex items-start gap-3 rounded-[20px] border border-slate-200 bg-white p-3 dark:border-white/[0.08] dark:bg-black/18">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-teal-100 text-[11px] font-semibold text-teal-700 dark:bg-cyan-300/12 dark:text-cyan-100">
                {comment.authorUsername?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[12px] font-medium text-slate-800 dark:text-white/82">@{comment.authorUsername}</span>
                  <span className="text-[10px] text-slate-400 dark:text-white/28">{formatDate(comment.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm leading-7 text-slate-600 dark:text-white/54">{comment.text}</p>
              </div>
              {canDelete(comment) ? (
                <button
                  onClick={() => void handleDelete(comment.id)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-slate-400 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100 dark:text-white/24 dark:hover:text-red-300"
                >
                  x
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <AppConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  )
}
