export type Bill = {
  id: string
  name: string
  amount: number
  dueDate: string
  paid: boolean
  sourceId: string
  frequency: 'monthly' | 'once'
}

export type MoneySource = {
  id: string
  name: string
  kind: 'bank' | 'benefit'
  balance: number
  canPayBills: boolean
  restriction?: string
}

export type ExpenseCategory = {
  id: string
  name: string
  sortOrder: number
}

export type Expense = {
  id: string
  label: string
  amount: number
  categoryId: string
  occurredAt: string
}

export type QuickExpensePreset = {
  id: string
  label: string
  categoryId: string
  categoryName: string
}

export function formatCLP(amount: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatShortDate(date: string) {
  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(date + 'T12:00:00'))
}

export function formatCurrentMonth(date = new Date()) {
  return new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(date)
}

export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

export function dateInputValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}
