import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { BalancePanel } from './components/BalancePanel'
import { BillsPanel } from './components/BillsPanel'
import { DailySpendingGuide } from './components/DailySpendingGuide'
import { Icon } from './components/Icon'
import { QuickExpensePanel } from './components/QuickExpensePanel'
import { SpendingSummary } from './components/SpendingSummary'
import {
  categorias,
  cuentasIniciales,
  dateInputValue,
  formatCurrentMonth,
  fuentesIniciales,
  gastosIniciales,
  gastosRapidos,
} from './data'
import './App.css'

type Dialog = 'source' | 'balance' | 'bill' | null

function App() {
  // Todo vive en memoria: al recargar la página vuelven los datos de ejemplo.
  const [sources, setSources] = useState(fuentesIniciales)
  const [bills, setBills] = useState(cuentasIniciales)
  const [expenses, setExpenses] = useState(gastosIniciales)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [dialog, setDialog] = useState<Dialog>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Campos de los formularios
  const [balanceInput, setBalanceInput] = useState('')
  const [billName, setBillName] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [billDate, setBillDate] = useState(dateInputValue())
  const [billFrequency, setBillFrequency] = useState<'monthly' | 'once'>('monthly')
  const [sourceName, setSourceName] = useState('')
  const [sourceKind, setSourceKind] = useState<'bank' | 'benefit'>('bank')
  const [sourceBalance, setSourceBalance] = useState('')
  const [sourceRestriction, setSourceRestriction] = useState('')

  useEffect(() => {
    const element = dialogRef.current
    if (dialog && element && !element.open) element.showModal()
    if (!dialog && element?.open) element.close()
  }, [dialog])

  const selectedSource = sources[selectedIndex]
  const reserved = selectedSource.canPayBills
    ? bills.filter((bill) => bill.sourceId === selectedSource.id && !bill.paid).reduce((sum, bill) => sum + bill.amount, 0)
    : 0
  const monthLabel = formatCurrentMonth()

  function submitSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSources([...sources, {
      id: `fuente-${Date.now()}`,
      name: sourceName,
      kind: sourceKind,
      balance: Number(sourceBalance),
      canPayBills: sourceKind === 'bank',
      restriction: sourceRestriction || undefined,
    }])
    setSelectedIndex(sources.length)
    setSourceName('')
    setSourceBalance('')
    setSourceRestriction('')
    setSourceKind('bank')
    setDialog(null)
  }

  function submitBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSources(sources.map((source, index) => index === selectedIndex ? { ...source, balance: Number(balanceInput) } : source))
    setDialog(null)
  }

  function submitBill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBills([...bills, {
      id: `cuenta-${Date.now()}`,
      name: billName,
      amount: Number(billAmount),
      dueDate: billDate,
      paid: false,
      sourceId: selectedSource.id,
      frequency: billFrequency,
    }])
    setBillName('')
    setBillAmount('')
    setDialog(null)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#resumen" aria-label="Saldo Claro, inicio">
          <span className="brand-mark"><Icon name="wallet" size={19} /></span>
          <span>saldo<span className="brand-light">claro</span></span>
        </a>
        <nav aria-label="Navegación principal">
          <a className="nav-link active" href="#resumen" aria-current="page">Mi resumen</a>
        </nav>
        <div className="topbar-right">
          <a className="button button-quiet auth-trigger" href="/auth/">Cerrar sesión</a>
        </div>
      </header>

      <main id="resumen" className="main-content">
        <section className="page-intro" aria-labelledby="page-title">
          <div>
            <p className="eyebrow intro-eyebrow">{monthLabel.toLocaleUpperCase('es-CL')} <span className="intro-dot">•</span> TU RESUMEN</p>
            <h1 id="page-title">Tu plata, con más claridad.</h1>
            <p className="intro-copy">Separa lo que ya tiene destino de lo que puedes usar con tranquilidad.</p>
          </div>
          <div className="page-actions">
            <button type="button" className="button button-quiet" onClick={() => setDialog('source')}>
              <Icon name="plus" size={17} /> Agregar fuente
            </button>
            <button type="button" className="button button-quiet" onClick={() => {
              setBalanceInput(String(selectedSource.balance))
              setDialog('balance')
            }}>
              <Icon name="wallet" size={17} /> Actualizar saldo
            </button>
          </div>
        </section>

        <div className="dashboard-grid">
          <BalancePanel
            source={selectedSource}
            index={selectedIndex}
            total={sources.length}
            reserved={reserved}
            onPrevious={() => setSelectedIndex((selectedIndex - 1 + sources.length) % sources.length)}
            onNext={() => setSelectedIndex((selectedIndex + 1) % sources.length)}
          />
          <BillsPanel
            bills={bills}
            source={selectedSource}
            monthLabel={monthLabel}
            onAdd={() => {
              setBillDate(dateInputValue())
              setBillFrequency('monthly')
              setDialog('bill')
            }}
            onTogglePaid={(id) => setBills(bills.map((bill) => bill.id === id ? { ...bill, paid: !bill.paid } : bill))}
          />
          <DailySpendingGuide
            source={selectedSource}
            available={selectedSource.kind === 'bank' ? selectedSource.balance - reserved : selectedSource.balance}
          />
          <QuickExpensePanel
            presets={gastosRapidos}
            onAdd={({ label, amount, categoryId }) => setExpenses([
              { id: `gasto-${Date.now()}`, label, amount, categoryId, occurredAt: new Date().toISOString() },
              ...expenses,
            ])}
          />
          <SpendingSummary expenses={expenses} categories={categorias} monthLabel={monthLabel} />
        </div>

        <footer className="page-footer">
          <span className="footer-lock" aria-hidden="true">●</span>
          Maqueta con datos de ejemplo. Los cambios no se guardan.
        </footer>
      </main>

      {dialog && (
        <dialog
          ref={dialogRef}
          className="modal"
          aria-labelledby="dialog-title"
          onCancel={(event) => { event.preventDefault(); setDialog(null) }}
          onClick={(event) => { if (event.target === event.currentTarget) setDialog(null) }}
        >
          <div className="modal-heading">
            <div>
              <p className="eyebrow">
                {dialog === 'bill' ? 'CUENTAS DEL MES' : dialog === 'source' ? 'NUEVA FUENTE' : 'SALDO DE REFERENCIA'}
              </p>
              <h2 id="dialog-title">
                {dialog === 'bill' ? 'Agregar una cuenta' : dialog === 'source' ? 'Agregar cuenta o beneficio' : 'Actualizar tu saldo'}
              </h2>
            </div>
            <button className="icon-button" type="button" onClick={() => setDialog(null)} aria-label="Cerrar">
              <Icon name="close" size={19} />
            </button>
          </div>

          {dialog === 'source' ? (
            <form className="modal-form" onSubmit={submitSource}>
              <label>Nombre<input autoFocus value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="Ej. Cuenta de ahorro" required /></label>
              <label>Tipo de fuente
                <select value={sourceKind} onChange={(event) => setSourceKind(event.target.value as 'bank' | 'benefit')}>
                  <option value="bank">Cuenta bancaria</option>
                  <option value="benefit">Beneficio</option>
                </select>
              </label>
              <label>Saldo actual
                <span className="modal-input-wrap"><span>$</span><input type="number" min="0" step="1" value={sourceBalance} onChange={(event) => setSourceBalance(event.target.value)} placeholder="0" required /></span>
              </label>
              {sourceKind === 'benefit' && (
                <label>Restricción (opcional)<input value={sourceRestriction} onChange={(event) => setSourceRestriction(event.target.value)} placeholder="Ej. Solo alimentación" /></label>
              )}
              <button className="button button-primary modal-submit" type="submit">Guardar fuente</button>
            </form>
          ) : dialog === 'bill' ? (
            <form className="modal-form" onSubmit={submitBill}>
              <label>Nombre de la cuenta<input autoFocus value={billName} onChange={(event) => setBillName(event.target.value)} placeholder="Ej. Internet" required /></label>
              <label>Monto estimado
                <span className="modal-input-wrap"><span>$</span><input type="number" min="1" step="1" value={billAmount} onChange={(event) => setBillAmount(event.target.value)} placeholder="0" required /></span>
              </label>
              <label>Fecha de vencimiento<input type="date" value={billDate} onChange={(event) => setBillDate(event.target.value)} required /></label>
              <label>Frecuencia
                <select value={billFrequency} onChange={(event) => setBillFrequency(event.target.value as 'monthly' | 'once')}>
                  <option value="monthly">Se repite cada mes</option>
                  <option value="once">Una sola vez</option>
                </select>
              </label>
              <button className="button button-primary modal-submit" type="submit">Agregar cuenta</button>
            </form>
          ) : (
            <form className="modal-form" onSubmit={submitBalance}>
              <label>Saldo de esta fuente
                <span className="modal-input-wrap"><span>$</span><input autoFocus type="number" min="0" step="1" value={balanceInput} onChange={(event) => setBalanceInput(event.target.value)} required /></span>
              </label>
              <button className="button button-primary modal-submit" type="submit">Guardar saldo</button>
            </form>
          )}
        </dialog>
      )}
    </div>
  )
}

export default App
