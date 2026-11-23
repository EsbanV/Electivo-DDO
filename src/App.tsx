import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { BalancePanel } from './components/BalancePanel'
import { BillsPanel } from './components/BillsPanel'
import { DailySpendingGuide } from './components/DailySpendingGuide'
import { Icon } from './components/Icon'
import { QuickExpensePanel } from './components/QuickExpensePanel'
import { SpendingSummary } from './components/SpendingSummary'
import {
  addBill,
  addExpense,
  addMoneySource,
  loadDashboard,
  setBillPaid,
  updateBalance,
} from './lib/budget-api'
import { isSupabaseConfigured, requireSupabase } from './lib/supabase'
import { dateInputValue, formatCurrentMonth, type MoneySource } from './data'
import './App.css'

type Dialog = 'source' | 'balance' | 'bill' | null
type DashboardData = Awaited<ReturnType<typeof loadDashboard>>

function App() {
  const [userEmail, setUserEmail] = useState('')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [balanceInput, setBalanceInput] = useState('')
  const [billName, setBillName] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [billDate, setBillDate] = useState(dateInputValue())
  const [billFrequency, setBillFrequency] = useState<'monthly' | 'once'>('monthly')
  const [sourceName, setSourceName] = useState('')
  const [sourceKind, setSourceKind] = useState<'bank_account' | 'benefit'>('bank_account')
  const [sourceBalance, setSourceBalance] = useState('')
  const [sourceRestriction, setSourceRestriction] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Al abrir la página: exige sesión y carga los datos del usuario.
  useEffect(() => {
    if (!isSupabaseConfigured) return
    requireSupabase().auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        window.location.assign('/auth/')
        return
      }
      setUserEmail(data.session.user.email ?? '')
      setDashboard(await loadDashboard())
    }).catch((cause: Error) => setError(cause.message))
  }, [])

  useEffect(() => {
    const element = dialogRef.current
    if (dialog && element && !element.open) element.showModal()
    if (!dialog && element?.open) element.close()
  }, [dialog])

  const sources = dashboard?.sources ?? []
  const selectedSource: MoneySource | undefined = sources.find((source) => source.id === selectedSourceId) ?? sources[0]
  const sourceIndex = sources.indexOf(selectedSource!)
  const bills = dashboard?.bills ?? []
  const sourceBills = selectedSource ? bills.filter((bill) => bill.sourceId === selectedSource.id) : []
  const reserved = selectedSource?.canPayBills
    ? sourceBills.filter((bill) => !bill.paid).reduce((sum, bill) => sum + bill.amount, 0)
    : 0
  const monthLabel = formatCurrentMonth()

  // Ejecuta un cambio en el servidor y vuelve a cargar los datos.
  // Devuelve true si salió bien.
  async function save(action: () => Promise<unknown>) {
    setError('')
    setIsSaving(true)
    try {
      await action()
      setDashboard(await loadDashboard())
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el cambio.')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  function closeDialog() {
    setDialog(null)
    setError('')
  }

  async function signOut() {
    await requireSupabase().auth.signOut()
    window.location.assign('/auth/')
  }

  async function submitSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const saved = await save(() => addMoneySource({
      name: sourceName,
      kind: sourceKind,
      balance: Number(sourceBalance),
      canPayBills: sourceKind === 'bank_account',
      restriction: sourceRestriction,
    }))
    if (!saved) return
    setSourceName('')
    setSourceBalance('')
    setSourceRestriction('')
    setSourceKind('bank_account')
    setDialog(null)
  }

  async function submitBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedSource && await save(() => updateBalance(selectedSource.id, Number(balanceInput)))) setDialog(null)
  }

  async function submitBill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedSource) return
    const saved = await save(() => addBill({
      name: billName,
      amount: Number(billAmount),
      dueOn: billDate,
      sourceId: selectedSource.id,
      frequency: billFrequency,
    }))
    if (!saved) return
    setBillName('')
    setBillAmount('')
    setDialog(null)
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="connection-state">
        <span className="brand-mark"><Icon name="wallet" size={19} /></span>
        <h1>Conecta la base de datos</h1>
        <p>Configura la URL y la clave pública de tu proyecto Supabase en <code>.env.local</code>.</p>
      </main>
    )
  }

  if (!dashboard) {
    return (
      <main className="connection-state">
        <span className="brand-mark"><Icon name="wallet" size={19} /></span>
        <p role={error ? 'alert' : undefined}>{error || 'Cargando tu espacio…'}</p>
      </main>
    )
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
          <span className="user-email">{userEmail}</span>
          <button className="button button-quiet auth-trigger" type="button" onClick={signOut}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main id="resumen" className="main-content">
        <section className="page-intro" aria-labelledby="page-title">
          <div>
            <h1 id="page-title">{monthLabel.charAt(0).toLocaleUpperCase('es-CL') + monthLabel.slice(1)}</h1>
            <p className="intro-copy">Lo que ya tiene destino, separado de lo que puedes usar.</p>
          </div>
          <div className="page-actions">
            {selectedSource && <button type="button" className="button button-quiet" onClick={() => {
              setSourceName('')
              setSourceBalance('')
              setSourceKind('bank_account')
              setSourceRestriction('')
              setDialog('source')
            }}>
              <Icon name="plus" size={17} /> Agregar fuente
            </button>}
            <button type="button" className="button button-quiet" onClick={() => {
              if (selectedSource) {
                setBalanceInput(String(selectedSource.balance))
                setDialog('balance')
              } else {
                setDialog('source')
              }
            }}>
              <Icon name="wallet" size={17} />
              {selectedSource ? 'Actualizar saldo' : 'Agregar cuenta o beneficio'}
            </button>
          </div>
        </section>

                {error && !dialog && <p className="dashboard-error" role="alert">{error}</p>}

        <div className="dashboard-grid">
          {selectedSource ? (
            <>
              <BalancePanel
                source={selectedSource}
                bills={sourceBills}
                index={sourceIndex}
                total={sources.length}
                reserved={reserved}
                onPrevious={() => setSelectedSourceId(sources[(sourceIndex - 1 + sources.length) % sources.length].id)}
                onNext={() => setSelectedSourceId(sources[(sourceIndex + 1) % sources.length].id)}
              />
              <BillsPanel
                key={selectedSource.id}
                bills={bills}
                source={selectedSource}
                onAdd={() => {
                  setBillDate(dateInputValue())
                  setBillFrequency('monthly')
                  setDialog('bill')
                }}
                onTogglePaid={(id) => {
                  const bill = bills.find((item) => item.id === id)
                  if (bill) void save(() => setBillPaid(id, !bill.paid))
                }}
              />
              <DailySpendingGuide
                source={selectedSource}
                available={selectedSource.kind === 'bank' ? selectedSource.balance - reserved : selectedSource.balance}
              />
            </>
          ) : (
            <section className="surface source-empty-state">
              <span className="decorative-icon"><Icon name="wallet" size={21} /></span>
              <div>
                <h2>Agrega una cuenta o beneficio</h2>
                <p>Ingresa el saldo manualmente. No conectamos con tu banco ni guardamos datos de tarjetas.</p>
              </div>
              <button className="button button-primary" type="button" onClick={() => setDialog('source')}>
                <Icon name="plus" size={17} /> Agregar fuente
              </button>
            </section>
          )}

          {selectedSource && (
            <>
              <QuickExpensePanel
                presets={dashboard.presets}
                onAdd={async (expense) => {
                  if (!await save(() => addExpense({ ...expense, sourceId: selectedSource.id }))) throw new Error(error || 'No se pudo guardar el gasto.')
                }}
              />
              <SpendingSummary
                key={selectedSource.id}
                expenses={dashboard.expenses.filter((expense) => expense.sourceId === selectedSource.id)}
                categories={dashboard.categories}
                monthLabel={selectedSource.name + ' · ' + monthLabel}
              />
            </>
          )}
        </div>

        <footer className="page-footer">
          <span className="footer-lock" aria-hidden="true">●</span>
          Tus registros se guardan en tu cuenta y los ingresas tú.
        </footer>
      </main>

      {dialog && (
        <dialog
          ref={dialogRef}
          className="modal"
          aria-labelledby="dialog-title"
          onCancel={(event) => { event.preventDefault(); closeDialog() }}
          onClick={(event) => { if (event.target === event.currentTarget) closeDialog() }}
        >
          <div className="modal-heading">
            <div>
              <h2 id="dialog-title">
                {dialog === 'bill' ? 'Agregar una cuenta' : dialog === 'source' ? 'Agregar cuenta o beneficio' : 'Actualizar tu saldo'}
              </h2>
            </div>
            <button className="icon-button" type="button" onClick={closeDialog} aria-label="Cerrar">
              <Icon name="close" size={19} />
            </button>
          </div>

          {dialog === 'source' ? (
            <form className="modal-form" onSubmit={submitSource}>
              <label>Nombre<input autoFocus value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="Ej. Cuenta principal" required /></label>
              <label>Tipo de fuente
                <select value={sourceKind} onChange={(event) => setSourceKind(event.target.value as 'bank_account' | 'benefit')}>
                  <option value="bank_account">Cuenta bancaria</option>
                  <option value="benefit">Beneficio</option>
                </select>
              </label>
              <label>Saldo actual
                <span className="modal-input-wrap"><span>$</span><input type="number" min="0" step="1" value={sourceBalance} onChange={(event) => setSourceBalance(event.target.value)} placeholder="0" required /></span>
              </label>
              {sourceKind === 'benefit' && (
                <label>Restricción (opcional)<input value={sourceRestriction} onChange={(event) => setSourceRestriction(event.target.value)} placeholder="Ej. Solo alimentación" /></label>
              )}
              {error && <p className="dialog-message" role="alert">{error}</p>}
              <button className="button button-primary modal-submit" type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : 'Guardar fuente'}</button>
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
              <p className="modal-note">Las cuentas mensuales se generarán para cada mes al abrir tu resumen.</p>
              {error && <p className="dialog-message" role="alert">{error}</p>}
              <button className="button button-primary modal-submit" type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : 'Agregar cuenta'}</button>
            </form>
          ) : (
            <form className="modal-form" onSubmit={submitBalance}>
              <label>Saldo registrado de esta fuente
                <span className="modal-input-wrap"><span>$</span><input autoFocus type="number" min="0" step="1" value={balanceInput} onChange={(event) => setBalanceInput(event.target.value)} required /></span>
              </label>
              <p className="modal-note">Se guardará un nuevo registro en tu historial de saldos.</p>
              {error && <p className="dialog-message" role="alert">{error}</p>}
              <button className="button button-primary modal-submit" type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : 'Guardar saldo'}</button>
            </form>
          )}
        </dialog>
      )}
    </div>
  )
}

export default App
