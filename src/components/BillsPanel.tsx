import type { Bill, MoneySource } from '../data'
import { formatCLP, formatShortDate } from '../data'
import { Icon } from './Icon'

type BillsPanelProps = {
  bills: Bill[]
  source: MoneySource
  monthLabel: string
  onAdd: () => void
  onTogglePaid: (id: string) => void
}

export function BillsPanel({ bills, source, monthLabel, onAdd, onTogglePaid }: BillsPanelProps) {
  const sourceBills = bills.filter((bill) => bill.sourceId === source.id)
  const pendingCount = sourceBills.filter((bill) => !bill.paid).length
  const sortedBills = [...sourceBills].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const isBenefit = source.kind === 'benefit'

  return (
    <section className="surface bills-panel" aria-labelledby="bills-title">
      <div className="section-heading">
        <div>
          <div className="eyebrow">{monthLabel.toLocaleUpperCase('es-CL')}</div>
          <h2 id="bills-title">{isBenefit ? 'Uso de este beneficio' : 'Cuentas por pagar'}</h2>
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
          sortedBills.map((bill) => (
            <article className={'bill-row' + (bill.paid ? ' is-paid' : '')} key={bill.id}>
              <span className="bill-icon"><Icon name="calendar" size={18} /></span>
              <div className="bill-copy">
                <strong>{bill.name}</strong>
                <span>
                  {bill.paid ? 'Pagada este mes' : 'Vence el ' + formatShortDate(bill.dueDate)}
                  {' · '}
                  {bill.frequency === 'monthly' ? 'Mensual' : 'Una vez'}
                </span>
              </div>
              <div className="bill-trailing">
                <strong>{formatCLP(bill.amount)}</strong>
                <button
                  className="text-action"
                  type="button"
                  onClick={() => onTogglePaid(bill.id)}
                  aria-label={(bill.paid ? 'Marcar pendiente: ' : 'Marcar pagada: ') + bill.name}
                >
                  {bill.paid ? 'Deshacer' : 'Marcar pagada'}
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {!isBenefit && source.canPayBills && (
        <>
          <button className="button button-secondary add-bill-button" type="button" onClick={onAdd}>
            <Icon name="plus" size={17} />
            Agregar cuenta
          </button>
          <p className="panel-hint">Los montos son estimados y los puedes ajustar.</p>
        </>
      )}
      {!isBenefit && !source.canPayBills && (
        <p className="restricted-note"><span className="restricted-mark" aria-hidden="true">i</span> {source.restriction || 'Esta fuente no está habilitada para asignarle cuentas.'}</p>
      )}
    </section>
  )
}
