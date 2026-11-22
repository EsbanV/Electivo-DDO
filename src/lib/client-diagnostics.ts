type LogContext = Record<string, string | number | boolean | null | undefined>

function redactText(value: string) {
  return value
    .replace(/([?&](?:access_token|refresh_token|token|code|password|email)=)[^&\s]*/gi, '$1[redacted]')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted-email]')
}

export function describeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: redactText(error.message) }
  }
  if (typeof error === 'object' && error !== null) {
    const value = error as Record<string, unknown>
    return {
      name: typeof value.name === 'string' ? value.name : 'Error',
      message: typeof value.message === 'string' ? redactText(value.message) : 'Unknown error',
      code: typeof value.code === 'string' ? value.code : undefined,
      status: typeof value.status === 'number' ? value.status : undefined,
    }
  }
  return { name: 'Error', message: redactText(String(error)) }
}

function log(level: 'info' | 'warn' | 'error', event: string, context?: LogContext) {
  if (!import.meta.env.DEV) return
  const record = { scope: 'saldo-claro', event, timestamp: new Date().toISOString(), ...context }
  if (level === 'error') console.error('[Saldo Claro]', record)
  else if (level === 'warn') console.warn('[Saldo Claro]', record)
  else console.info('[Saldo Claro]', record)
}

export const clientDiagnostics = {
  info: (event: string, context?: LogContext) => log('info', event, context),
  warn: (event: string, context?: LogContext) => log('warn', event, context),
  error: (event: string, context?: LogContext) => log('error', event, context),
}

function resourcePath(target: EventTarget) {
  if (target instanceof HTMLScriptElement) return new URL(target.src, window.location.href).pathname
  if (target instanceof HTMLLinkElement) return new URL(target.href, window.location.href).pathname
  if (target instanceof HTMLElement) return target.getAttribute('src') ?? target.tagName.toLowerCase()
  return 'unknown-resource'
}

export function installClientDiagnostics(route: 'dashboard' | 'auth' | 'demo') {
  if (!import.meta.env.DEV) return
  clientDiagnostics.info('client.started', { route, mode: import.meta.env.MODE })

  window.addEventListener('error', (event) => {
    if (event.target && event.target !== window) {
      clientDiagnostics.error('resource.load_failed', {
        route,
        path: resourcePath(event.target),
      })
      return
    }

    const errorEvent = event as ErrorEvent
    clientDiagnostics.error('window.error', {
      route,
      message: errorEvent.message ? redactText(errorEvent.message) : 'Uncaught browser error',
      file: errorEvent.filename ? new URL(errorEvent.filename, window.location.href).pathname : undefined,
      line: errorEvent.lineno || undefined,
      column: errorEvent.colno || undefined,
    })
  }, true)

  window.addEventListener('unhandledrejection', (event) => {
    clientDiagnostics.error('promise.unhandled_rejection', {
      route,
      ...describeError(event.reason),
    })
  })
}
