import type { Bill, Expense, ExpenseCategory, MoneySource, QuickExpensePreset } from '../data'
import { requireSupabase } from './supabase'

export type DashboardData = {
  sources: MoneySource[]
  categories: ExpenseCategory[]
  presets: QuickExpensePreset[]
  bills: Bill[]
  expenses: Expense[]
}

// Llama a la API enviando el token de la sesión de Supabase.
async function request<T>(path: string, method = 'GET', body?: object): Promise<T> {
  const { data } = await requireSupabase().auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Tu sesión ya no está activa. Vuelve a iniciar sesión.')

  const response = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new Error(result?.error ?? 'No se pudo completar la solicitud.')
  return result as T
}

export const loadDashboard = () => request<DashboardData>('/api/dashboard')

export const addMoneySource = (input: {
  name: string
  kind: 'bank_account' | 'benefit'
  balance: number
  canPayBills: boolean
  restriction?: string
}) => request('/api/sources', 'POST', input)

export const updateBalance = (sourceId: string, amount: number) =>
  request('/api/balances', 'POST', { sourceId, amount })

export const addExpense = (input: { label: string; amount: number; categoryId: string; presetId: string; sourceId: string }) =>
  request('/api/expenses', 'POST', input)

export const setBillPaid = (billId: string, paid: boolean) =>
  request('/api/bills', 'PATCH', { billId, paid })

export const addBill = (input: {
  name: string
  amount: number
  dueOn: string
  sourceId: string
  frequency: 'monthly' | 'once'
}) => request('/api/bills', 'POST', input)
