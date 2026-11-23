import { json, readJson, requiredAmount, requiredText, withUser } from './_lib/http'

export const POST = withUser(async (request, { db, user }) => {
  const body = await readJson(request)
  const { error } = await db.from('expenses').insert({
    user_id: user.id,
    label: requiredText(body.label, 'El nombre del gasto'),
    amount: requiredAmount(body.amount, 'El monto'),
    category_id: requiredText(body.categoryId, 'La categoría'),
    money_source_id: requiredText(body.sourceId, 'La cuenta'),
    quick_preset_id: requiredText(body.presetId, 'El acceso rápido'),
  })
  if (error) throw error
  return json({ saved: true }, 201)
})
