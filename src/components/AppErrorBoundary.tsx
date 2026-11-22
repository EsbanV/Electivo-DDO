import { Component, type ErrorInfo, type ReactNode } from 'react'
import { describeError, clientDiagnostics } from '../lib/client-diagnostics'

type Props = { children: ReactNode; route: 'dashboard' | 'auth' | 'demo' }
type State = { hasError: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    clientDiagnostics.error('react.render_failed', {
      route: this.props.route,
      ...describeError(error),
      componentStack: info.componentStack?.slice(0, 2000),
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-runtime-error" role="alert">
          <p className="eyebrow">SALDO CLARO</p>
          <h1>No pudimos mostrar esta pantalla</h1>
          <p>La app registró el error en la consola del navegador. Recarga la página para intentarlo de nuevo.</p>
          <button className="runtime-error-button" type="button" onClick={() => window.location.reload()}>
            Recargar página
          </button>
        </main>
      )
    }
    return this.props.children
  }
}
