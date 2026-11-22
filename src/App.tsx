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
import { clientDiagnostics, describeError } from './lib/client-diagnostics'
import { dateInputValue, formatCurrentMonth, type MoneySource } from './data'
import './App.css'

type Dialog = 'source' | 'balance' | 'bill' | null
type DashboardData = Awaited<ReturnType<typeof loadDashboard>>

function App() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [isCheckingSession, setIsCheckingSession] = useState(isSupabaseConfigured)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
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
  const [sourceCanPayBills, setSourceCanPayBills] = useState(true)
  const [sourceRestriction, setSourceRestriction] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    const client = requireSupabase()
    let isCurrent = true
    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (!isCurrent) return
      if (!session) {
        clientDiagnostics.warn('auth.session_missing', { route: 'dashboard', mode: 'supabase' })
        window.location.assign('/auth/')
        return
      }
      setUserId(session.user.id)
      setUserEmail(session.user.email ?? '')
      setIsCheckingSession(false)
    })

    client.auth.getSession().then(({ data, error }) => {
      if (!isCurrent) return
      if (error || !data.session) {
        if (error) clientDiagnostics.error('auth.session_check_failed', describeError(error))
        else clientDiagnostics.warn('auth.session_missing', { route: 'dashboard', mode: 'supabase' })
        window.location.assign('/auth/')
        return
      }
      setUserId(data.session.user.id)
      setUserEmail(data.session.user.email ?? '')
      setIsCheckingSession(false)
    })

    return () => {
      isCurrent = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!userId) return
    let isCurrent = true
    loadDashboard()
      .then((result) => {
        if (isCurrent) {
          setDashboard(result)
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar tus datos.')
      })
    return () => { isCurrent = false }
  }, [userId])

  useEffect(() => {
    const element = dialogRef.current
    if (dialog && element && !element.open) element.showModal()
    if (!dialog && element?.open) element.close()
  }, [dialog])

  const sources = dashboard?.sources ?? []
  const selectedSource: MoneySource | undefined = sources.find((source) => source.id === selectedSourceId) ?? sources[0]
  const sourceIndex = selectedSource ? sources.findIndex((source) => source.id === selectedSource.id) : -1
  const bills = dashboard?.bills ?? []
  const expenses = dashboard?.expenses ?? []
  const categories = dashboard?.categories ?? []
  const presets = dashboard?.presets ?? []
  const sourceBills = selectedSource ? bills.filter((bill) => bill.sourceId === selectedSource.id) : []
  const reserved = selectedSource?.canPayBills
    ? sourceBills.filter((bill) => !bill.paid).reduce((sum, bill) => sum + bill.amount, 0)
    : 0
  const monthLabel = formatCurrentMonth()

  async function refreshDashboard() {
    if (!userId) return
    setDashboard(await loadDashboard())
  }

  async function runAction(action: () => Promise<void>) {
    setActionError('')
    setIsSaving(true)
    try {
      await action()
      await refreshDashboard()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo guardar el cambio.')
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  async function signOut() {
    try {
      const { error } = await requireSupabase().auth.signOut()
      if (error) throw error
    } catch (error) {
      clientDiagnostics.error('auth.signout_failed', describeError(error))
      setActionError('No pudimos cerrar sesión. Inténtalo de nuevo.')
    }
  }

  async function submitSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedBalance = Number(sourceBalance)
    if (!userId || !sourceName.trim() || !Number.isFinite(parsedBalance) || parsedBalance < 0) {
      setActionError('Ingresa un nombre y un saldo igual o mayor que cero.')
      return
    }
    try {
      await runAction(() => addMoneySource({
        name: sourceName,
        kind: sourceKind,
        balance: parsedBalance,
        canPayBills: sourceKind === 'benefit' ? sourceCanPayBills : true,
        restriction: sourceRestriction,
      }))
      setSourceName('')
      setSourceBalance('')
      setSourceRestriction('')
      setSourceKind('bank_account')
      setSourceCanPayBills(true)
      setDialog(null)
    } catch { /* El mensaje queda visible junto al formulario. */ }
  }

  async function submitBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amount = Number(balanceInput)
    if (!userId || !selectedSource || !Number.isFinite(amount) || amount < 0) {
      setActionError('Ingresa un saldo igual o mayor que cero.')
      return
    }
    try {
      await runAction(() => updateBalance(selectedSource.id, amount))
      setDialog(null)
    } catch { /* El mensaje queda visible junto al formulario. */ }
  }

  async function submitBill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amount = Number(billAmount)
    if (!userId || !selectedSource || !billName.trim() || !Number.isFinite(amount) || amount <= 0) {
      setActionError('Completa el nombre y un monto mayor que cero.')
      return
    }
    try {
      await runAction(() => addBill({
        name: billName,
        amount,
        dueOn: billDate,
        sourceId: selectedSource.id,
        frequency: billFrequency,
      }))
      setBillName('')
      setBillAmount('')
      setDialog(null)
    } catch { /* El mensaje queda visible junto al formulario. */ }
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="connection-state">
        <span className="brand-mark"><Icon name="wallet" size={19} /></span>
        <p className="eyebrow">SALDO CLARO</p>
        <h1>Conecta la base de datos</h1>
        <p>Configura la URL y la clave pública de tu proyecto Supabase en <code>.env.local</code> para activar el acceso y guardar información.</p>
        <a className="button button-primary" href="/auth/">Ir a autenticación</a>
      </main>
    )
  }

  if (isCheckingSession || (Boolean(userId) && !dashboard && !loadError)) {
    return <main className="connection-state"><span className="brand-mark"><Icon name="wallet" size={19} /></span><p>Cargando tu espacio…</p></main>
  }

  if (loadError && !dashboard) {
    return (
      <main className="connection-state">
        <span className="brand-mark"><Icon name="wallet" size={19} /></span>
        <p className="eyebrow">NO SE PUDIERON CARGAR LOS DATOS</p>
        <h1>Revisa la conexión</h1>
        <p role="alert">{loadError}</p>
        <button className="button button-primary" type="button" onClick={() => window.location.reload()}>Intentar de nuevo</button>
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
            <p className="eyebrow intro-eyebrow">{monthLabel.toLocaleUpperCase('es-CL')} <span className="intro-dot">•</span> TU RESUMEN</p>
            <h1 id="page-title">Tu plata, con más claridad.</h1>
            <p className="intro-copy">Separa lo que ya tiene destino de lo que puedes usar con tranquilidad.</p>
          </div>
          <div className="page-actions">
            {selectedSource && <button type="button" className="button button-quiet" onClick={() => {
              setActionError('')
              setSourceName('')
              setSourceBalance('')
              setSourceKind('bank_account')
              setSourceCanPayBills(true)
              setSourceRestriction('')
              setDialog('source')
            }}>
              <Icon name="plus" size={17} /> Agregar fuente
            </button>}
            <button type="button" className="button button-quiet" onClick={() => {
              setActionError('')
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

        {(actionError || loadError) && <p className="dashboard-error" role="alert">{actionError || loadError}</p>}

        <div className="dashboard-grid">
          {selectedSource ? (
            <>
              <BalancePanel
                source={selectedSource}
                index={sourceIndex}
                total={sources.length}
                reserved={reserved}
                onPrevious={() => setSelectedSourceId(sources[(sourceIndex - 1 + sources.length) % sources.length].id)}
                onNext={() => setSelectedSourceId(sources[(sourceIndex + 1) % sources.length].id)}
              />
              <BillsPanel
                bills={bills}
                source={selectedSource}
                monthLabel={monthLabel}
                onAdd={() => {
                  setActionError('')
                  setBillDate(dateInputValue())
                  setBillFrequency('monthly')
                  setDialog('bill')
                }}
                onTogglePaid={(id) => {
                  const bill = bills.find((item) => item.id === id)
                  if (userId && bill) void runAction(() => setBillPaid(id, !bill.paid)).catch(() => undefined)
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
                <div className="eyebrow">PRIMER PASO</div>
                <h2>Agrega una cuenta o beneficio</h2>
                <p>Ingresa el saldo manualmente. No conectamos con tu banco ni guardamos datos de tarjetas.</p>
              </div>
              <button className="button button-primary" type="button" onClick={() => setDialog('source')}>
                <Icon name="plus" size={17} /> Agregar fuente
              </button>
            </section>
          )}

          <QuickExpensePanel
            presets={presets}
            onAdd={async (expense) => {
              if (!userId) throw new Error('Tu sesión ya no está activa. Vuelve a iniciar sesión.')
              await runAction(() => addExpense(expense))
            }}
          />
          <SpendingSummary expenses={expenses} categories={categories} monthLabel={monthLabel} />
        </div>

        <footer className="page-footer">
          <span className="footer-lock" aria-hidden="true">●</span>
          Tus registros se guardan en tu cuenta y se ingresan manualmente.
        </footer>
      </main>

      {dialog && (
        <dialog
          ref={dialogRef}
          className="modal"
          aria-labelledby="dialog-title"
          onCancel={(event) => { event.preventDefault(); setDialog(null); setActionError('') }}
          onClick={(event) => { if (event.target === event.currentTarget) { setDialog(null); setActionError('') } }}
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
            <button className="icon-button" type="button" onClick={() => { setDialog(null); setActionError('') }} aria-label="Cerrar">
              <Icon name="close" size={19} />
            </button>
          </div>

          {dialog === 'source' ? (
            <form className="modal-form" onSubmit={submitSource}>
              <label>Nombre<input autoFocus value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="Ej. Cuenta principal" required /></label>
              <label>Tipo de fuente
                <select value={sourceKind} onChange={(event) => {
                  const kind = event.target.value as 'bank_account' | 'benefit'
                  setSourceKind(kind)
                  setSourceCanPayBills(kind === 'bank_account')
                }}>
                  <option value="bank_account">Cuenta bancaria</option>
                  <option value="benefit">Beneficio</option>
                </select>
              </label>
              <label>Saldo actual
                <span className="modal-input-wrap"><span>$</span><input type="number" min="0" step="1" value={sourceBalance} onChange={(event) => setSourceBalance(event.target.value)} placeholder="0" required /></span>
              </label>
              {sourceKind === 'benefit' && <>
                <label>¿Puede pagar cuentas?
                  <select value={sourceCanPayBills ? 'yes' : 'no'} onChange={(event) => setSourceCanPayBills(event.target.value === 'yes')}>
                    <option value="no">No, tiene uso restringido</option>
                    <option value="yes">Sí</option>
                  </select>
                </label>
                <label>Restricción (opcional)<input value={sourceRestriction} onChange={(event) => setSourceRestriction(event.target.value)} placeholder="Ej. Solo alimentación" /></label>
              </>}
              {actionError && <p className="dialog-message" role="alert">{actionError}</p>}
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
              {actionError && <p className="dialog-message" role="alert">{actionError}</p>}
              <button className="button button-primary modal-submit" type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : 'Agregar cuenta'}</button>
            </form>
          ) : (
            <form className="modal-form" onSubmit={submitBalance}>
              <label>Saldo registrado de esta fuente
                <span className="modal-input-wrap"><span>$</span><input autoFocus type="number" min="0" step="1" value={balanceInput} onChange={(event) => setBalanceInput(event.target.value)} required /></span>
              </label>
              <p className="modal-note">Se guardará un nuevo registro en tu historial de saldos.</p>
              {actionError && <p className="dialog-message" role="alert">{actionError}</p>}
              <button className="button button-primary modal-submit" type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : 'Guardar saldo'}</button>
            </form>
          )}
        </dialog>
      )}
    </div>
  )
}

export default App
