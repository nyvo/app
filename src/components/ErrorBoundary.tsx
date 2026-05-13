import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

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

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <main className="flex min-h-[60vh] flex-col items-center justify-center bg-background px-6 py-12 text-center">
          <h1 className="max-w-md text-2xl font-semibold tracking-tight text-foreground">
            Noe gikk galt
          </h1>
          <p className="mt-3 max-w-md text-sm text-foreground-muted">
            Prøv igjen om noen sekunder. Hvis problemet vedvarer, ta kontakt.
          </p>
          <Button size="sm" className="mt-7" onClick={this.handleReload}>
            Last på nytt
          </Button>
          <a
            href="/"
            className="mt-3 text-sm text-foreground-muted underline decoration-foreground-muted/40 underline-offset-2 hover:decoration-foreground-muted"
          >
            eller gå til startsiden →
          </a>
        </main>
      )
    }

    return this.props.children
  }
}
