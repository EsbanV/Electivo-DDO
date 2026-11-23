import type { Bill, Expense, ExpenseCategory, MoneySource, QuickExpensePreset } from '../data'
import { monthKey, startOfMonth } from '../data'
import { requireSupabase } from './supabase'
import { clientDiagnostics, describeError } from './client-diagnostics'

export type DashboardData = {
  sources: MoneySource[]
  categories: ExpenseCategory[]
  presets: QuickExpensePreset[]
  bills: Bill[]
  expenses: Expense[]
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data, error } = await requireSupabase().auth.getSession()
  if (error) throw error
  const accessToken = data.session?.access_token
  if (!accessToken) throw new Error('Tu sesión ya no está activa. Vuelve a iniciar sesión.')

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${accessToken}`)
  if (init.body) headers.set('Content-Type', 'application/json')

  const response = await fetch(path, { ...init, headers })
  const result = await response.json().catch(() => null) as { error?: string } | null
  if (!response.ok) throw new Error(result?.error ?? 'No se pudo completar la solicitud.')
  return result as T
}

async function withOperationLog<T>(operation: string, task: () => Promise<T>) {
  const startedAt = performance.now()
  clientDiagnostics.info('api.operation.started', { operation })
  try {
    const result = await task()
    clientDiagnostics.info('api.operation.succeeded', {
      operation,
      durationMs: Math.round(performance.now() - startedAt),
    })
    return result
  } catch (error) {
    clientDiagnostics.error('api.operation.failed', {
      operation,
      durationMs: Math.round(performance.now() - startedAt),
      ...describeError(error),
    })
    throw error
  }
}

export function loadDashboard() {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const query = new URLSearchParams({
    period: monthKey(now),
    from: startOfMonth(now).toISOString(),
    to: nextMonth.toISOString(),
  })
  return withOperationLog('dashboard.load', () => request<DashboardData>(`/api/dashboard?${query}`))
}

export function addMoneySource(input: {
  name: string
  kind: 'bank_account' | 'benefit'
  balance: number
  canPayBills: boolean
  restriction?: string
}) {
  return withOperationLog('source.create', () => request<void>('/api/sources', {
    method: 'POST',
    body: JSON.stringify(input),
  }))
}

export function updateBalance(sourceId: string, amount: number) {
  return withOperationLog('balance.create_snapshot', () => request<void>('/api/balances', {
    method: 'POST',
    body: JSON.stringify({ sourceId, amount }),
  }))
}

export function addExpense(input: { label: string; amount: number; categoryId: string; presetId: string }) {
  return withOperationLog('expense.create', () => request<void>('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(input),
  }))
}

export function setBillPaid(billId: string, paid: boolean) {
  return withOperationLog('bill.update_status', () => request<void>('/api/bills', {
    method: 'PATCH',
    body: JSON.stringify({ billId, paid }),
  }))
}

export function addBill(input: {
  name: string
  amount: number
  dueOn: string
  sourceId: string
  frequency: 'monthly' | 'once'
}) {
  return withOperationLog('bill.create', () => request<void>('/api/bills', {
    method: 'POST',
    body: JSON.stringify(input),
  }))
}
