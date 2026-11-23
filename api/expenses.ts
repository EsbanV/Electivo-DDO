import { methodNotAllowed, readJson, requiredAmount, requiredText, requiredUuid, withUser } from './_lib/http'

export const POST = withUser('expense.create', async (request, { db, user }) => {
  const body = await readJson(request)
  const label = requiredText(body.label, 'El nombre del gasto', 100)
  const amount = requiredAmount(body.amount, 'El monto')
  const categoryId = requiredUuid(body.categoryId, 'La categoría')
  const presetId = requiredUuid(body.presetId, 'El acceso rápido')
  const { error } = await db.from('expenses').insert({
    user_id: user.id,
    label,
    amount,
    category_id: categoryId,
    quick_preset_id: presetId,
  })
  if (error) throw error
  return Response.json({ saved: true }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
})

export function GET() { return methodNotAllowed(['POST']) }
