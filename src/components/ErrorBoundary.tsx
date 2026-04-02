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

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-8 text-center">
            <h1 className="mb-2 text-lg font-medium text-foreground">
              Noe gikk galt
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
              En uventet feil oppstod. Prøv å laste siden på nytt.
            </p>
            <Button onClick={this.handleReload}>
              Last siden på nytt
            </Button>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-6 max-h-40 overflow-auto rounded-lg bg-background p-3 text-left text-xs text-status-error-text">
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
