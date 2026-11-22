import type { MoneySource } from '../data'
import { formatCLP } from '../data'
import { Icon } from './Icon'

type BalancePanelProps = {
  source: MoneySource
  index: number
  total: number
  reserved: number
  onPrevious: () => void
  onNext: () => void
}

export function BalancePanel({
  source,
  index,
  total,
  reserved,
  onPrevious,
  onNext,
}: BalancePanelProps) {
  const available = source.kind === 'bank' ? source.balance - reserved : source.balance
  const isBenefit = source.kind === 'benefit'

  return (
    <section
      className="balance-card"
      aria-label="Carrusel de cuentas y beneficios"
      aria-roledescription="carrusel"
    >
      <div className="balance-topline">
        <span className="balance-label">
          {isBenefit ? 'SALDO DEL BENEFICIO' : 'DISPONIBLE DESPUÉS DE CUENTAS'}
        </span>
        <span className="estimate-tag"><span /> Estimado</span>
      </div>

      <div className="source-switcher">
        <button
          className="source-arrow"
          type="button"
          aria-label="Ver fuente anterior"
          onClick={onPrevious}
          disabled={total < 2}
        >
          <Icon name="chevron-left" size={19} />
        </button>
        <div className="source-details" aria-live="polite" aria-atomic="true">
          <span className="source-kind">{isBenefit ? 'BENEFICIO' : 'CUENTA'}</span>
          <strong>{source.name}</strong>
          <span className="source-position">Fuente {index + 1} de {total}</span>
        </div>
        <button
          className="source-arrow"
          type="button"
          aria-label="Ver fuente siguiente"
          onClick={onNext}
          disabled={total < 2}
        >
          <Icon name="chevron-right" size={19} />
        </button>
      </div>

      <p className="available-amount" aria-live="polite" aria-atomic="true">
        {formatCLP(available)}
      </p>
      <p className="balance-caption">
        {isBenefit
        ? (source.restriction || 'Uso restringido') + '. No se considera para pagar cuentas.'
          : 'Saldo ingresado menos las cuentas asignadas que aún faltan.'}
      </p>

      <div className="balance-divider" />

      <div className="balance-breakdown">
        <div>
          <span className="breakdown-label"><span className="balance-dot light" />Saldo registrado</span>
          <strong>{formatCLP(source.balance)}</strong>
        </div>
        <div>
          <span className="breakdown-label"><span className="balance-dot lime" />{isBenefit ? 'Uso permitido' : 'Cuentas pendientes'}</span>
          <strong>{isBenefit ? 'Restringido' : formatCLP(reserved)}</strong>
        </div>
      </div>
      <div className="balance-foot">
        <span>Saldo ingresado manualmente</span>
        <span className="carousel-dots" aria-hidden="true">
          {Array.from({ length: total }, (_, dotIndex) => (
            <span className={dotIndex === index ? 'active' : ''} key={dotIndex} />
          ))}
        </span>
      </div>
    </section>
  )
}
