import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DemoPage } from './DemoPage'
import { AppErrorBoundary } from '../components/AppErrorBoundary'
import { installClientDiagnostics } from '../lib/client-diagnostics'
import '../index.css'

installClientDiagnostics('demo')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary route="demo"><DemoPage /></AppErrorBoundary>
  </StrictMode>,
)
