import { apiError, requiredAmount, requiredUuid, readJson, withUser } from './_lib/http'

export const POST = withUser('balance.create_snapshot', async (request, { db, user }) => {
  const body = await readJson(request)
  const sourceId = requiredUuid(body.sourceId, 'La fuente')
  const amount = requiredAmount(body.amount, 'El saldo', true)
  const { error } = await db.from('balance_snapshots').insert({ user_id: user.id, money_source_id: sourceId, amount })
  if (error) throw error
  return Response.json({ saved: true }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
})

export function GET() { return apiError('Método no permitido.', 405) }
