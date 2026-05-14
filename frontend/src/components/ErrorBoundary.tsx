import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="max-w-md rounded-[28px] border border-red-400/20 bg-red-500/10 p-8 text-center">
            <div className="text-[11px] uppercase tracking-[0.24em] text-red-300/80">Something went wrong</div>
            <h2 className="mt-4 text-2xl font-semibold text-white">This section didn&apos;t load cleanly.</h2>
            <p className="mt-3 text-sm leading-7 text-red-50/70">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-6 rounded-full border border-white/16 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/14"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
