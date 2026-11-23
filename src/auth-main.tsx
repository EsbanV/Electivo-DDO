import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthPage } from './pages/AuthPage'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { installClientDiagnostics } from './lib/client-diagnostics'

installClientDiagnostics('auth')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary route="auth"><AuthPage /></AppErrorBoundary>
  </StrictMode>,
)
