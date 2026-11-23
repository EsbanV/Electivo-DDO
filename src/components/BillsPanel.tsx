import type { Bill, MoneySource } from '../data'
import { AnimatePresence, motion } from 'motion/react'
import confetti from 'canvas-confetti'
import { formatCLP, formatShortDate } from '../data'
import { Icon } from './Icon'
import { InfoTip } from './InfoTip'

// Una cuenta es urgente si vence en 3 días o menos (o ya venció).
function venceEnPocosDias(dueDate: string) {
  const dias = (Date.parse(dueDate + 'T12:00:00') - Date.now()) / (24 * 60 * 60 * 1000)
  return dias <= 3
}

// Confeti desde el botón que se presionó, solo al marcar como pagada.
function celebrar(boton: HTMLElement) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const caja = boton.getBoundingClientRect()
  confetti({
    particleCount: 60,
    spread: 70,
    startVelocity: 28,
    ticks: 120,
    colors: ['#4de0c4', '#6fb4ff', '#9d94ff', '#ff9b7d'],
    origin: { x: (caja.left + caja.width / 2) / window.innerWidth, y: (caja.top + caja.height / 2) / window.innerHeight },
  })
}

type BillsPanelProps = {
  bills: Bill[]
  source: MoneySource
  monthLabel?: string
  onAdd: () => void
  onTogglePaid: (id: string) => void
}

export function BillsPanel({ bills, source, onAdd, onTogglePaid }: BillsPanelProps) {
  const sourceBills = bills.filter((bill) => bill.sourceId === source.id)
  const pendingCount = sourceBills.filter((bill) => !bill.paid).length
  const sortedBills = [...sourceBills].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const isBenefit = source.kind === 'benefit'

  return (
    <section className="surface bills-panel" aria-labelledby="bills-title">
      <div className="section-heading">
        <div>
          <h2 id="bills-title">{isBenefit ? 'Uso de este beneficio' : 'Cuentas por pagar'}</h2>
          <InfoTip text={isBenefit ? 'Este beneficio tiene un uso restringido y no se descuenta de tus cuentas.' : 'Lista tus cuentas con fecha de vencimiento. Márcalas como pagadas y tu saldo libre se actualiza. Los montos son estimados.'} />
        </div>
        <span className="count-pill">{isBenefit ? 'Uso restringido' : pendingCount + ' pendientes'}</span>
      </div>

      <div className="bill-list">
        {isBenefit ? (
          <div className="restricted-note">
            <span className="restricted-mark" aria-hidden="true">i</span>
            <p>{source.restriction || 'Uso restringido'}. No lo restamos de tus cuentas.</p>
          </div>
        ) : sortedBills.length === 0 ? (
          <p className="empty-state">Todavía no agregas cuentas para esta fuente.</p>
        ) : (
          <AnimatePresence initial={false}>
          {sortedBills.map((bill) => (
            <motion.article
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: bill.paid ? 0.5 : 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={'bill-row' + (bill.paid ? ' is-paid' : '') + (!bill.paid && venceEnPocosDias(bill.dueDate) ? ' is-soon' : '')} key={bill.id}>
              <span className="bill-date">
                <b>{Number(bill.dueDate.slice(8, 10))}</b>
                <span>{formatShortDate(bill.dueDate).split(' ')[1]}</span>
              </span>
              <div className="bill-copy">
                <strong>{bill.name}</strong>
                <span>
                  {bill.paid ? 'Pagada' : 'Pendiente'} · {bill.frequency === 'monthly' ? 'Mensual' : 'Una vez'}
                </span>
              </div>
              <div className="bill-trailing">
                <strong>{formatCLP(bill.amount)}</strong>
                <button
                  className="text-action"
                  type="button"
                  onClick={(event) => {
                    if (!bill.paid) celebrar(event.currentTarget)
                    onTogglePaid(bill.id)
                  }}
                  aria-label={(bill.paid ? 'Marcar pendiente: ' : 'Marcar pagada: ') + bill.name}
                >
                  {bill.paid ? 'Deshacer' : 'Marcar pagada'}
                </button>
              </div>
            </motion.article>
          ))}
          </AnimatePresence>
        )}
      </div>

      {!isBenefit && source.canPayBills && (
        <>
          <button className="button button-secondary add-bill-button" type="button" onClick={onAdd}>
            <Icon name="plus" size={17} />
            Agregar cuenta
          </button>
        </>
      )}
      {!isBenefit && !source.canPayBills && (
        <p className="restricted-note"><span className="restricted-mark" aria-hidden="true">i</span> {source.restriction || 'Esta fuente no está habilitada para asignarle cuentas.'}</p>
      )}
    </section>
  )
}
