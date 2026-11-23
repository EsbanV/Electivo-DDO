import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

export type ApiContext = { db: SupabaseClient; user: User }
export type ApiHandler = (request: Request, context: ApiContext) => Promise<Response>

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

function errorStatus(error: unknown) {
  const value = error as { status?: number; code?: string }
  if (value.status === 401 || value.status === 403) return value.status
  if (value.status === 400 || value.status === 404 || value.status === 503) return value.status
  if (value.code === '42501') return 403
  if (value.code === '23503' || value.code === '23505' || value.code === '23514' || value.code === '22023') return 400
  return 500
}

function errorMessage(error: unknown, status: number) {
  if (status === 401) return 'Inicia sesión para continuar.'
  if (status === 403) return 'No tienes permiso para realizar esta acción.'
  if (status === 400) return 'Los datos enviados no son válidos.'
  if (status === 404) return 'No encontramos el recurso solicitado.'
  if (status === 503 && error instanceof Error) return error.message
  if (status === 503 && error instanceof Error) return error.message
  return 'Ocurrió un error al procesar la solicitud.'
}

export function apiError(message: string, status = 400) {
  const response = json({ error: message }, status)
  response.headers.set('X-Internal-Error-Detail', message)
  return response
}

export async function readJson(request: Request) {
  try {
    return await request.json() as Record<string, unknown>
  } catch {
    throw Object.assign(new Error('El cuerpo de la solicitud debe ser JSON válido.'), { status: 400 })
  }
}

export function requiredText(value: unknown, label: string, maxLength = 100) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw Object.assign(new Error(`${label} no es válido.`), { status: 400 })
  }
  return value.trim()
}

export function requiredAmount(value: unknown, label: string, allowZero = false) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw Object.assign(new Error(`${label} no es válido.`), { status: 400 })
  }
  return value
}

export function requiredUuid(value: unknown, label: string) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw Object.assign(new Error(`${label} no es válido.`), { status: 400 })
  }
  return value
}

export function withUser(operation: string, handler: ApiHandler) {
  return async (request: Request) => {
    const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
    const startedAt = performance.now()
    let status = 200
    let failureLogged = false
    try {
      const url = process.env.SUPABASE_URL?.trim()
      const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim()
      if (!url || !key) throw Object.assign(new Error('El servidor no tiene configuradas las variables SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY.'), { status: 503 })

      const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
      if (!token) throw Object.assign(new Error('Missing bearer token.'), { status: 401 })

      const db = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      })
      const { data, error } = await db.auth.getUser(token)
      if (error || !data.user) throw Object.assign(new Error('Invalid or expired session.'), { status: 401 })

      const response = await handler(request, { db, user: data.user })
      status = response.status
      const detail = response.headers.get('X-Internal-Error-Detail')
      response.headers.delete('X-Internal-Error-Detail')
      if (status >= 400) {
        console.warn('[Saldo Claro API] request.rejected', {
          requestId,
          operation,
          method: request.method,
          status,
          durationMs: Math.round(performance.now() - startedAt),
          detail: detail?.replace(/[\r\n\t]/g, ' ').slice(0, 160),
        })
        failureLogged = true
      }
      return response
    } catch (error) {
      status = errorStatus(error)
      const detail = error instanceof Error ? error.message.replace(/[\r\n\t]/g, ' ').slice(0, 240) : 'Unknown error'
      const value = error as { code?: unknown }
      const log = status >= 500 ? console.error : console.warn
      log('[Saldo Claro API] request.failed', {
        requestId,
        operation,
        method: request.method,
        status,
        durationMs: Math.round(performance.now() - startedAt),
        code: typeof value.code === 'string' ? value.code : undefined,
        detail,
      })
      failureLogged = true
      return json({ error: errorMessage(error, status) }, status)
    } finally {
      if (!failureLogged) {
        const log = status >= 400 ? console.warn : console.info
        log('[Saldo Claro API] request.completed', {
          requestId,
          operation,
          method: request.method,
          status,
          durationMs: Math.round(performance.now() - startedAt),
        })
      }
    }
  }
}

export function methodNotAllowed(allowed: string[]) {
  return new Response(JSON.stringify({ error: 'Método no permitido.' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json; charset=utf-8', Allow: allowed.join(', '), 'Cache-Control': 'no-store' },
  })
}
