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

export function dateInputValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

// ---- Datos de ejemplo (la app es solo un maquetado, no hay base de datos) ----

function diasDesdeHoy(dias: number) {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + dias)
  return dateInputValue(fecha)
}

export const fuentesIniciales: MoneySource[] = [
  { id: 'banco', name: 'Cuenta principal', kind: 'bank', balance: 128000, canPayBills: true },
  { id: 'beneficio', name: 'Beneficio alimentación', kind: 'benefit', balance: 36500, canPayBills: false, restriction: 'Solo alimentación' },
]

export const categorias: ExpenseCategory[] = [
  { id: 'pequenas', name: 'Compras pequeñas', sortOrder: 0 },
  { id: 'colacion', name: 'Colación', sortOrder: 1 },
  { id: 'transporte', name: 'Transporte', sortOrder: 2 },
  { id: 'otros', name: 'Otros', sortOrder: 3 },
]

export const gastosRapidos: QuickExpensePreset[] = [
  { id: 'chocolate', label: 'Chocolate', categoryId: 'pequenas', categoryName: 'Compras pequeñas' },
  { id: 'bebida', label: 'Bebida', categoryId: 'pequenas', categoryName: 'Compras pequeñas' },
  { id: 'colacion', label: 'Colación', categoryId: 'colacion', categoryName: 'Colación' },
  { id: 'transporte', label: 'Transporte', categoryId: 'transporte', categoryName: 'Transporte' },
  { id: 'otro', label: 'Otro gasto', categoryId: 'otros', categoryName: 'Otros' },
]

export function cuentasIniciales(): Bill[] {
  return [
    { id: 'celular', name: 'Plan de celular', amount: 14990, dueDate: diasDesdeHoy(2), paid: false, sourceId: 'banco', frequency: 'monthly' },
    { id: 'luz', name: 'Electricidad', amount: 18000, dueDate: diasDesdeHoy(5), paid: false, sourceId: 'banco', frequency: 'monthly' },
    { id: 'internet', name: 'Internet', amount: 12990, dueDate: diasDesdeHoy(9), paid: false, sourceId: 'banco', frequency: 'monthly' },
  ]
}

export function gastosIniciales(): Expense[] {
  const ahora = new Date().toISOString()
  return [
    { id: 'g1', label: 'Chocolate', amount: 1200, categoryId: 'pequenas', occurredAt: ahora },
    { id: 'g2', label: 'Bebida', amount: 1500, categoryId: 'pequenas', occurredAt: ahora },
    { id: 'g3', label: 'Colación', amount: 3200, categoryId: 'colacion', occurredAt: ahora },
    { id: 'g4', label: 'Transporte', amount: 900, categoryId: 'transporte', occurredAt: ahora },
  ]
}
