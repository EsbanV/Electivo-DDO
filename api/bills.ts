import { apiError, methodNotAllowed, readJson, requiredAmount, requiredText, requiredUuid, withUser } from './_lib/http'

export const POST = withUser('bill.create', async (request, { db }) => {
  const body = await readJson(request)
  const name = requiredText(body.name, 'El nombre', 100)
  const amount = requiredAmount(body.amount, 'El monto')
  const dueOn = requiredText(body.dueOn, 'La fecha', 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueOn) || Number.isNaN(Date.parse(`${dueOn}T00:00:00Z`))) return apiError('La fecha de vencimiento no es válida.')
  const sourceId = requiredUuid(body.sourceId, 'La fuente')
  const frequency = body.frequency
  if (frequency !== 'monthly' && frequency !== 'once') return apiError('La frecuencia no es válida.')

  const { data, error } = await db.rpc('create_bill', {
    p_name: name,
    p_amount: amount,
    p_due_on: dueOn,
    p_money_source_id: sourceId,
    p_frequency: frequency,
  })
  if (error) throw error
  return Response.json({ id: data }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
})

export const PATCH = withUser('bill.update_status', async (request, { db, user }) => {
  const body = await readJson(request)
  const billId = requiredUuid(body.billId, 'La cuenta')
  if (typeof body.paid !== 'boolean') return apiError('El estado de pago no es válido.')

  const { data, error } = await db.from('bill_occurrences')
    .update({ status: body.paid ? 'paid' : 'pending', paid_at: body.paid ? new Date().toISOString() : null })
    .eq('id', billId)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (!data) return apiError('No encontramos esa cuenta.', 404)
  return Response.json({ saved: true }, { headers: { 'Cache-Control': 'no-store' } })
})

export function GET() { return methodNotAllowed(['POST', 'PATCH']) }
