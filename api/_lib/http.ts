import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

export type ApiContext = { db: SupabaseClient; user: User }

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export function apiError(message: string, status = 400) {
  return json({ error: message }, status)
}

// ---- Validación de lo que escribe el usuario ----

function invalid(label: string): never {
  throw Object.assign(new Error(`${label} no es válido.`), { status: 400 })
}

export async function readJson(request: Request) {
  try {
    return await request.json() as Record<string, unknown>
  } catch {
    return invalid('El cuerpo de la solicitud')
  }
}

export function requiredText(value: unknown, label: string, maxLength = 100) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) invalid(label)
  return (value as string).trim()
}

export function requiredAmount(value: unknown, label: string, allowZero = false) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) invalid(label)
  return value as number
}

// ---- Envoltorio de cada endpoint: verifica la sesión y captura errores ----

export function withUser(handler: (request: Request, context: ApiContext) => Promise<Response>) {
  return async (request: Request) => {
    try {
      const url = process.env.SUPABASE_URL
      const key = process.env.SUPABASE_PUBLISHABLE_KEY
      if (!url || !key) return apiError('Faltan SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY en el servidor.', 503)

      const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
      if (!token) return apiError('Inicia sesión para continuar.', 401)

      // Con el token del usuario, las políticas RLS de la base limitan qué filas ve.
      const db = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } } })
      const { data, error } = await db.auth.getUser(token)
      if (error || !data.user) return apiError('Inicia sesión para continuar.', 401)

      return await handler(request, { db, user: data.user })
    } catch (error) {
      console.error('[api]', request.method, new URL(request.url).pathname, error)
      const { status, message } = error as { status?: number; message?: string }
      // Los errores de validación traen status 400 y un mensaje seguro para mostrar.
      if (status === 400) return apiError(message ?? 'Los datos enviados no son válidos.')
      return apiError('Ocurrió un error al procesar la solicitud.', 500)
    }
  }
}
