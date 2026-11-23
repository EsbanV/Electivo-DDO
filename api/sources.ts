import { apiError, json, readJson, requiredAmount, requiredText, withUser } from './_lib/http'

export const POST = withUser(async (request, { db }) => {
  const body = await readJson(request)
  if (body.kind !== 'bank_account' && body.kind !== 'benefit') return apiError('El tipo de fuente no es válido.')

  const { data, error } = await db.rpc('create_money_source', {
    p_name: requiredText(body.name, 'El nombre', 80),
    p_kind: body.kind,
    p_initial_balance: requiredAmount(body.balance, 'El saldo', true),
    p_can_pay_bills: body.canPayBills === true,
    p_restriction_note: body.restriction ? requiredText(body.restriction, 'La restricción', 160) : null,
  })
  if (error) throw error
  return json({ id: data }, 201)
})
