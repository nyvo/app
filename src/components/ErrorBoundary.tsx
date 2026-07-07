import { Component, type ErrorInfo, type ReactNode } from 'react'
import { PageState } from '@/components/page-state/page-state'
import { captureError } from '@/lib/monitoring'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  // When any value in this list changes while an error is showing, the
  // boundary resets. Pass e.g. `[location.pathname]` so navigating away from a
  // crashed route clears the error instead of trapping the user on it.
  resetKeys?: ReadonlyArray<unknown>
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
    captureError(error, { componentStack: info.componentStack })
  }

  componentDidUpdate(prevProps: Props) {
    if (!this.state.hasError) return
    const prev = prevProps.resetKeys
    const next = this.props.resetKeys
    if (!next) return
    const changed =
      !prev || prev.length !== next.length || next.some((key, i) => !Object.is(key, prev[i]))
    if (changed) {
      this.setState({ hasError: false, error: null })
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return <PageState variant="server-error" />
    }

    return this.props.children
  }
}
