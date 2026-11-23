import { apiError, json, readJson, requiredAmount, requiredText, withUser } from './_lib/http'

export const POST = withUser(async (request, { db }) => {
  const body = await readJson(request)
  if (body.frequency !== 'monthly' && body.frequency !== 'once') return apiError('La frecuencia no es válida.')

  const { data, error } = await db.rpc('create_bill', {
    p_name: requiredText(body.name, 'El nombre'),
    p_amount: requiredAmount(body.amount, 'El monto'),
    p_due_on: requiredText(body.dueOn, 'La fecha', 10),
    p_money_source_id: requiredText(body.sourceId, 'La fuente'),
    p_frequency: body.frequency,
  })
  if (error) throw error
  return json({ id: data }, 201)
})

// Marca una cuenta como pagada o pendiente.
export const PATCH = withUser(async (request, { db, user }) => {
  const body = await readJson(request)
  if (typeof body.paid !== 'boolean') return apiError('El estado de pago no es válido.')

  const { data, error } = await db.from('bill_occurrences')
    .update({ status: body.paid ? 'paid' : 'pending', paid_at: body.paid ? new Date().toISOString() : null })
    .eq('id', requiredText(body.billId, 'La cuenta'))
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (!data) return apiError('No encontramos esa cuenta.', 404)
  return json({ saved: true })
})
