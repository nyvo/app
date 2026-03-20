import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 text-center">
            <h1 className="mb-2 text-lg font-medium text-zinc-900">
              Noe gikk galt
            </h1>
            <p className="mb-6 text-sm text-zinc-500">
              En uventet feil oppstod. Prøv å laste siden på nytt.
            </p>
            <button
              onClick={this.handleReload}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              Last siden på nytt
            </button>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-6 max-h-40 overflow-auto rounded-lg bg-zinc-100 p-3 text-left text-xs text-red-600">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
