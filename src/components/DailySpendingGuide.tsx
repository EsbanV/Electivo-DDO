import type { MoneySource } from '../data'
import { formatCLP } from '../data'
import { AnimatedAmount } from './AnimatedAmount'
import { InfoTip } from './InfoTip'

function getMonthWindow(date = new Date()) {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const daysRemaining = lastDay.getDate() - date.getDate() + 1
  const monthEnd = new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'long',
  }).format(lastDay)

  return { daysRemaining, monthEnd }
}

export function DailySpendingGuide({ available, source }: {
  available: number
  source: MoneySource
}) {
  const { daysRemaining, monthEnd } = getMonthWindow()
  const spendable = Math.max(0, available)
  const dailyAmount = Math.floor(spendable / daysRemaining)
  const hasShortfall = available < 0

  return (
    <section className="surface daily-guide" aria-labelledby="daily-guide-title">
      <div className="daily-guide-heading">
        <div>
          <h2 id="daily-guide-title">Para gastar cada día</h2>
          <InfoTip text={'Divide tu saldo libre entre los días que quedan del mes. Se calcula con el saldo ingresado menos las cuentas pendientes, así que actualiza el saldo cuando cambie.' + (source.kind === 'benefit' ? ' Considera la restricción: ' + (source.restriction || 'uso definido por el beneficio') + '.' : '')} />
        </div>
      </div>

      <p className="daily-guide-amount">
        <strong><AnimatedAmount value={dailyAmount} /></strong>
        <span>al día</span>
      </p>
      <p className="daily-guide-formula">
        {hasShortfall
          ? 'Las cuentas pendientes superan el saldo registrado.'
          : `${formatCLP(spendable)} disponibles ÷ ${daysRemaining} días, hasta el ${monthEnd}.`}
      </p>
    </section>
  )
}
