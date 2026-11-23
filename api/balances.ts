import { json, readJson, requiredAmount, requiredText, withUser } from './_lib/http'

export const POST = withUser(async (request, { db, user }) => {
  const body = await readJson(request)
  const sourceId = requiredText(body.sourceId, 'La fuente')
  const amount = requiredAmount(body.amount, 'El saldo', true)
  const { error } = await db.from('balance_snapshots').insert({ user_id: user.id, money_source_id: sourceId, amount })
  if (error) throw error
  return json({ saved: true }, 201)
})
