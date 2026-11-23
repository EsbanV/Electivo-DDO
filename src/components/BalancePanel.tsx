import type { Bill, MoneySource } from '../data'
import { formatCLP, formatShortDate } from '../data'
import { AnimatedAmount } from './AnimatedAmount'
import { Icon } from './Icon'

const DIAS_REGLA = 30
const MS_POR_DIA = 24 * 60 * 60 * 1000

function hoyAlMediodia() {
  const hoy = new Date()
  hoy.setHours(12, 0, 0, 0)
  return hoy
}

// Regla de los próximos 30 días: una marca por día, empezando hoy.
// Las marcas altas son vencimientos de cuentas de esta fuente.
function ReglaDeDias({ bills }: { bills: Bill[] }) {
  const hoy = hoyAlMediodia()

  // Posición de cada cuenta en la regla (0 = hoy). Las atrasadas quedan en hoy.
  const cuentasPorDia = new Map<number, Bill>()
  for (const bill of bills) {
    const dias = Math.round((Date.parse(bill.dueDate + 'T12:00:00') - hoy.getTime()) / MS_POR_DIA)
    if (dias < DIAS_REGLA) cuentasPorDia.set(Math.max(dias, 0), bill)
  }

  const proxima = bills
    .filter((bill) => !bill.paid)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]

  return (
    <div className="ruler-block">
      <ol className="ruler" aria-label="Próximos 30 días con vencimientos">
        {Array.from({ length: DIAS_REGLA }, (_, dia) => {
          const bill = cuentasPorDia.get(dia)
          const fecha = new Date(hoy.getTime() + dia * MS_POR_DIA)
          const clases = ['tick', dia === 0 && 'today', bill && 'bill', bill?.paid && 'paid'].filter(Boolean).join(' ')
          return (
            <li className={clases} key={dia} style={{ '--i': dia } as React.CSSProperties} title={bill?.name}>
              {(dia === 0 || bill) && <span className="tick-label">{dia === 0 ? 'hoy' : fecha.getDate() === 1 ? formatShortDate(fecha.toISOString().slice(0, 10)) : fecha.getDate()}</span>}
            </li>
          )
        })}
      </ol>
      <p className="ruler-next">
        {proxima
          ? <><b>Lo próximo: {proxima.name}</b> <span>el {formatShortDate(proxima.dueDate)} · {formatCLP(proxima.amount)}</span></>
          : <span>No tienes cuentas pendientes en esta fuente.</span>}
      </p>
    </div>
  )
}

type BalancePanelProps = {
  source: MoneySource
  bills: Bill[]
  index: number
  total: number
  reserved: number
  onPrevious: () => void
  onNext: () => void
}

export function BalancePanel({ source, bills, index, total, reserved, onPrevious, onNext }: BalancePanelProps) {
  const available = source.kind === 'bank' ? source.balance - reserved : source.balance
  const isBenefit = source.kind === 'benefit'

  return (
    <section className="balance-card" aria-label="Cuentas y beneficios" aria-roledescription="carrusel">
      <div className="balance-head">
        <div className="source-switcher">
          <button className="source-arrow" type="button" aria-label="Ver fuente anterior" onClick={onPrevious} disabled={total < 2}>
            <Icon name="chevron-left" size={19} />
          </button>
          <div className="source-details" aria-live="polite" aria-atomic="true">
            <span className="source-kind">{isBenefit ? 'Beneficio' : 'Cuenta'}</span>
            <strong>{source.name}</strong>
            <span className="source-position">Fuente {index + 1} de {total}</span>
          </div>
          <button className="source-arrow" type="button" aria-label="Ver fuente siguiente" onClick={onNext} disabled={total < 2}>
            <Icon name="chevron-right" size={19} />
          </button>
        </div>
        <span className="estimate-tag"><span />Estimado</span>
      </div>

      <p className="balance-label">{isBenefit ? 'Saldo del beneficio' : 'Libre después de tus cuentas'}</p>
      <p className="available-amount"><AnimatedAmount value={available} /></p>
      <p className="balance-caption">
        {isBenefit
          ? (source.restriction || 'Uso restringido') + '. No se considera para pagar cuentas.'
          : 'Saldo ingresado menos las cuentas asignadas que aún faltan.'}
      </p>

      <ReglaDeDias bills={bills} />

      <div className="balance-breakdown">
        <div>
          <span className="breakdown-label">Saldo registrado</span>
          <strong>{formatCLP(source.balance)}</strong>
        </div>
        <div>
          <span className="breakdown-label">{isBenefit ? 'Uso permitido' : 'Cuentas pendientes'}</span>
          <strong>{isBenefit ? 'Restringido' : formatCLP(reserved)}</strong>
        </div>
      </div>
    </section>
  )
}
