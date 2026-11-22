import type { MoneySource } from '../data'
import { formatCLP } from '../data'

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
          <div className="eyebrow">HASTA FIN DE MES</div>
          <h2 id="daily-guide-title">Ritmo diario sugerido</h2>
        </div>
        <span className="daily-guide-tag">Orientativo</span>
      </div>

      <p className="daily-guide-amount" aria-live="polite">
        <strong>{formatCLP(dailyAmount)}</strong>
        <span>por día</span>
      </p>
      <p className="daily-guide-formula">
        {hasShortfall
          ? 'Las cuentas pendientes superan el saldo registrado.'
          : `${formatCLP(spendable)} disponibles ÷ ${daysRemaining} días, hasta el ${monthEnd}.`}
      </p>
      <p className="daily-guide-note">
        {source.kind === 'benefit'
          ? `Usa esta referencia considerando la restricción: ${source.restriction || 'uso definido por el beneficio'}.`
          : 'Se calcula con el saldo ingresado menos las cuentas pendientes. Actualiza el saldo cuando cambie.'}
      </p>
    </section>
  )
}
