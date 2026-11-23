import type { Bill, Expense, ExpenseCategory, MoneySource, QuickExpensePreset } from '../src/data'
import { json, withUser } from './_lib/http'

// Entrega todo lo que necesita la pantalla principal para el mes actual.
export const GET = withUser(async (_request, { db }) => {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const period = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-01`

  const generated = await db.rpc('ensure_monthly_bill_occurrences', { p_period_month: period })
  if (generated.error) throw generated.error

  const [sourcesResult, snapshotsResult, categoriesResult, presetsResult, billsResult, expensesResult] = await Promise.all([
    db.from('money_sources').select('id, name, kind, can_pay_bills, restriction_note').eq('is_active', true).order('created_at'),
    db.from('balance_snapshots').select('money_source_id, amount, captured_at').order('captured_at', { ascending: false }),
    db.from('expense_categories').select('id, name, sort_order').eq('is_active', true).order('sort_order'),
    db.from('quick_presets').select('id, label, category_id').eq('is_active', true).order('sort_order'),
    db.from('bill_occurrences').select('id, name, amount, due_on, status, money_source_id, rule_id').eq('period_month', period).neq('status', 'skipped').order('due_on'),
    db.from('expenses').select('id, label, amount, category_id, occurred_at').gte('occurred_at', from.toISOString()).lt('occurred_at', to.toISOString()).order('occurred_at', { ascending: false }),
  ])

  for (const result of [sourcesResult, snapshotsResult, categoriesResult, presetsResult, billsResult, expensesResult]) {
    if (result.error) throw result.error
  }

  const sourcesRows = sourcesResult.data ?? []
  const snapshotRows = snapshotsResult.data ?? []
  const categoryRows = categoriesResult.data ?? []
  const latestBalanceBySource = new Map<string, number>()
  for (const snapshot of snapshotRows) {
    if (!latestBalanceBySource.has(snapshot.money_source_id)) latestBalanceBySource.set(snapshot.money_source_id, Number(snapshot.amount))
  }
  const categoryById = new Map(categoryRows.map((category) => [category.id, category.name]))

  const response = {
    sources: sourcesRows.map((source): MoneySource => ({
      id: source.id,
      name: source.name,
      kind: source.kind === 'benefit' ? 'benefit' : 'bank',
      balance: latestBalanceBySource.get(source.id) ?? 0,
      canPayBills: source.can_pay_bills,
      restriction: source.restriction_note ?? undefined,
    })),
    categories: categoryRows.map((category): ExpenseCategory => ({
      id: category.id,
      name: category.name,
      sortOrder: category.sort_order,
    })),
    presets: (presetsResult.data ?? []).map((preset): QuickExpensePreset => ({
      id: preset.id,
      label: preset.label,
      categoryId: preset.category_id,
      categoryName: categoryById.get(preset.category_id) ?? 'Otros',
    })),
    bills: (billsResult.data ?? []).map((bill): Bill => ({
      id: bill.id,
      name: bill.name,
      amount: Number(bill.amount),
      dueDate: bill.due_on,
      paid: bill.status === 'paid',
      sourceId: bill.money_source_id,
      frequency: bill.rule_id ? 'monthly' : 'once',
    })),
    expenses: (expensesResult.data ?? []).map((expense): Expense => ({
      id: expense.id,
      label: expense.label,
      amount: Number(expense.amount),
      categoryId: expense.category_id,
      occurredAt: expense.occurred_at,
    })),
  }
  return json(response)
})
