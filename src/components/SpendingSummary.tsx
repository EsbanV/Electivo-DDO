import type { Expense, ExpenseCategory } from '../data'
import { formatCLP } from '../data'

const colors = ['mint', 'gold', 'blue', 'lilac']

export function SpendingSummary({ expenses, categories, monthLabel }: {
  expenses: Expense[]
  categories: ExpenseCategory[]
  monthLabel: string
}) {
  const totals = categories.map((category, index) => ({
    id: category.id,
    label: category.name,
    color: colors[index % colors.length],
    total: expenses
      .filter((expense) => expense.categoryId === category.id)
      .reduce((sum, expense) => sum + expense.amount, 0),
  }))
  const maxTotal = Math.max(...totals.map((category) => category.total), 1)
  const smallPurchases = totals.find((category) => category.label === 'Compras pequeñas')?.total ?? 0

  return (
    <section className="surface spending-panel" aria-labelledby="spending-title">
      <div className="section-heading">
        <div>
          <div className="eyebrow">UNA MIRADA SIMPLE</div>
          <h2 id="spending-title">Tus gastos del mes</h2>
        </div>
        <span className="month-label">{monthLabel}</span>
      </div>

      <div className="small-spend-highlight">
        <div className="highlight-mark" aria-hidden="true">↗</div>
        <div>
          <span>Compras pequeñas</span>
          <strong>{formatCLP(smallPurchases)}</strong>
        </div>
        <span className="highlight-note">registradas</span>
      </div>

      <ul className="category-list">
        {totals.map((category) => (
          <li className="category-row" key={category.id}>
            <div className="category-label">
              <span className={'category-dot ' + category.color} aria-hidden="true" />
              <span>{category.label}</span>
            </div>
            <div className="category-amount">{formatCLP(category.total)}</div>
            <div
              className="category-track"
              role="meter"
              aria-label={category.label}
              aria-valuemin={0}
              aria-valuemax={maxTotal}
              aria-valuenow={category.total}
            >
              <span
                className={'category-fill ' + category.color}
                style={{ width: ((category.total / maxTotal) * 100) + '%' }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="panel-hint">Sin juicios: solo una referencia para decidir.</p>
    </section>
  )
}
