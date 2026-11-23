import { useState } from 'react'
import { BalancePanel } from '../components/BalancePanel'
import { BillsPanel } from '../components/BillsPanel'
import { DailySpendingGuide } from '../components/DailySpendingGuide'
import { Icon } from '../components/Icon'
import { QuickExpensePanel } from '../components/QuickExpensePanel'
import { SpendingSummary } from '../components/SpendingSummary'
import {
  dateInputValue,
  formatCurrentMonth,
  type Bill,
  type Expense,
  type ExpenseCategory,
  type MoneySource,
  type QuickExpensePreset,
} from '../data'
import '../App.css'
import './DemoPage.css'

function sampleDates() {
  const first = new Date()
  first.setDate(first.getDate() + 2)
  const second = new Date()
  second.setDate(second.getDate() + 5)
  const third = new Date()
  third.setDate(third.getDate() + 9)
  return [dateInputValue(first), dateInputValue(second), dateInputValue(third)]
}

const sources: MoneySource[] = [
  { id: 'demo-bank', name: 'Cuenta principal', kind: 'bank', balance: 128000, canPayBills: true },
  { id: 'demo-benefit', name: 'Beneficio alimentación', kind: 'benefit', balance: 36500, canPayBills: false, restriction: 'Solo alimentación' },
]

const categories: ExpenseCategory[] = [
  { id: 'demo-small', name: 'Compras pequeñas', sortOrder: 0 },
  { id: 'demo-food', name: 'Colación', sortOrder: 1 },
  { id: 'demo-transport', name: 'Transporte', sortOrder: 2 },
  { id: 'demo-other', name: 'Otros', sortOrder: 3 },
]

const presets: QuickExpensePreset[] = [
  { id: 'demo-chocolate', label: 'Chocolate', categoryId: 'demo-small', categoryName: 'Compras pequeñas' },
  { id: 'demo-drink', label: 'Bebida', categoryId: 'demo-small', categoryName: 'Compras pequeñas' },
  { id: 'demo-snack', label: 'Colación', categoryId: 'demo-food', categoryName: 'Colación' },
  { id: 'demo-transit', label: 'Transporte', categoryId: 'demo-transport', categoryName: 'Transporte' },
  { id: 'demo-other-expense', label: 'Otro gasto', categoryId: 'demo-other', categoryName: 'Otros' },
]

function initialBills(): Bill[] {
  const [cellphoneDate, electricityDate, internetDate] = sampleDates()
  return [
    { id: 'demo-cellphone', name: 'Plan de celular', amount: 14990, dueDate: cellphoneDate, paid: false, sourceId: 'demo-bank', frequency: 'monthly' },
    { id: 'demo-electricity', name: 'Electricidad', amount: 18000, dueDate: electricityDate, paid: false, sourceId: 'demo-bank', frequency: 'monthly' },
    { id: 'demo-internet', name: 'Internet', amount: 12990, dueDate: internetDate, paid: false, sourceId: 'demo-bank', frequency: 'monthly' },
  ]
}

function initialExpenses(): Expense[] {
  const now = new Date().toISOString()
  return [
    { id: 'demo-expense-1', label: 'Chocolate', amount: 1200, categoryId: 'demo-small', occurredAt: now },
    { id: 'demo-expense-2', label: 'Bebida', amount: 1500, categoryId: 'demo-small', occurredAt: now },
    { id: 'demo-expense-3', label: 'Colación', amount: 3200, categoryId: 'demo-food', occurredAt: now },
    { id: 'demo-expense-4', label: 'Transporte', amount: 900, categoryId: 'demo-transport', occurredAt: now },
  ]
}

export function DemoPage() {
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0)
  const [bills, setBills] = useState(initialBills)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [message, setMessage] = useState('')
  const [resetCounter, setResetCounter] = useState(0)
  const selectedSource = sources[selectedSourceIndex]
  const sourceBills = bills.filter((bill) => bill.sourceId === selectedSource.id)
  const reserved = selectedSource.kind === 'bank'
    ? sourceBills.filter((bill) => !bill.paid).reduce((sum, bill) => sum + bill.amount, 0)
    : 0

  function resetDemo() {
    setSelectedSourceIndex(0)
    setBills(initialBills())
    setExpenses(initialExpenses())
    setResetCounter((count) => count + 1)
    setMessage('Demo restablecida. Puedes volver a explorarla.')
  }

  return (
    <div className="app-shell demo-shell">
      <header className="topbar demo-topbar">
        <a className="brand" href="/auth/" aria-label="Saldo Claro, volver al acceso">
          <span className="brand-mark"><Icon name="wallet" size={19} /></span>
          <span>saldo<span className="brand-light">claro</span></span>
        </a>
        <nav aria-label="Navegación principal">
          <a className="nav-link active" href="#resumen" aria-current="page">Demo interactiva</a>
        </nav>
        <div className="topbar-right demo-topbar-actions">
          <span className="demo-status"><span aria-hidden="true" /> Datos ficticios</span>
          <a className="button button-quiet demo-access-link" href="/auth/">Ir al acceso</a>
        </div>
      </header>

      <main id="resumen" className="main-content demo-content">
        <section className="page-intro" aria-labelledby="demo-title">
          <div>
            <h1 id="demo-title">Tu plata, con más claridad.</h1>
            <p className="intro-copy">Una demo con datos ficticios: marca pagos, anota gastos y mira cómo cambia tu saldo libre.</p>
          </div>
          <button className="button button-quiet demo-reset" type="button" onClick={resetDemo}>Restablecer demo</button>
        </section>

        <div className="demo-notice" role="note">
          <strong>Versión de muestra.</strong>
          <span>Tus cambios son temporales y no se guardan en ninguna cuenta.</span>
        </div>
        {message && <p className="demo-feedback" role="status">{message}</p>}

        <div className="dashboard-grid">
          <BalancePanel
            source={selectedSource}
            bills={sourceBills}
            index={selectedSourceIndex}
            total={sources.length}
            reserved={reserved}
            onPrevious={() => setSelectedSourceIndex((index) => (index - 1 + sources.length) % sources.length)}
            onNext={() => setSelectedSourceIndex((index) => (index + 1) % sources.length)}
          />
          <BillsPanel
            bills={bills}
            source={selectedSource}
            monthLabel={formatCurrentMonth()}
            onAdd={() => {
              const due = new Date()
              due.setDate(due.getDate() + 12)
              setBills((current) => [...current, {
                id: `demo-bill-${Date.now()}`,
                name: 'Cuenta de ejemplo',
                amount: 9900,
                dueDate: dateInputValue(due),
                paid: false,
                sourceId: selectedSource.id,
                frequency: 'once',
              }])
              setMessage('Agregamos una cuenta de ejemplo solo a esta demo.')
            }}
            onTogglePaid={(id) => setBills((current) => current.map((bill) => bill.id === id ? { ...bill, paid: !bill.paid } : bill))}
          />
          <DailySpendingGuide
            source={selectedSource}
            available={selectedSource.kind === 'bank' ? selectedSource.balance - reserved : selectedSource.balance}
          />
          <QuickExpensePanel
            key={resetCounter}
            presets={presets}
            onAdd={async ({ label, amount, categoryId }) => {
              setExpenses((current) => [{
                id: `demo-expense-${Date.now()}`,
                label,
                amount,
                categoryId,
                occurredAt: new Date().toISOString(),
              }, ...current])
              setMessage('Gasto agregado a la vista de muestra; no se guardó en una cuenta.')
            }}
          />
          <SpendingSummary expenses={expenses} categories={categories} monthLabel={formatCurrentMonth()} />
        </div>

        <footer className="page-footer demo-footer">
          <span className="footer-lock" aria-hidden="true">●</span>
          Valores de ejemplo. No representan información financiera real.
        </footer>
      </main>
    </div>
  )
}
