import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

// Single seam for reporting caught render errors. Right now it logs to the
// console, which is fine in dev but invisible once deployed. When you wire
// up an error-monitoring service (Sentry, etc.), this is the only place
// that needs to change.
const reportError = (error: Error, info: ErrorInfo): void => {
  console.error('Unhandled render error:', error, info)
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, info)
  }

  handleReset = (): void => {
    this.setState({ hasError: false })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
          <p className="max-w-sm text-sm text-gray-500">
            An unexpected error occurred. Reloading the page usually fixes this.
          </p>
          <button
            onClick={this.handleReset}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Reload page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
