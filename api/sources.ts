import { apiError, methodNotAllowed, readJson, requiredAmount, requiredText, withUser } from './_lib/http'

export const POST = withUser('source.create', async (request, { db }) => {
  const body = await readJson(request)
  const name = requiredText(body.name, 'El nombre', 80)
  const balance = requiredAmount(body.balance, 'El saldo', true)
  const kind = body.kind
  if (kind !== 'bank_account' && kind !== 'benefit') return apiError('El tipo de fuente no es válido.')
  if (typeof body.canPayBills !== 'boolean') return apiError('La opción de pago de cuentas no es válida.')
  const restriction = typeof body.restriction === 'string' && body.restriction.trim()
    ? requiredText(body.restriction, 'La restricción', 160)
    : null

  const { data, error } = await db.rpc('create_money_source', {
    p_name: name,
    p_kind: kind,
    p_initial_balance: balance,
    p_can_pay_bills: body.canPayBills,
    p_restriction_note: restriction,
  })
  if (error) throw error
  return Response.json({ id: data }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
})

export function GET() { return methodNotAllowed(['POST']) }
