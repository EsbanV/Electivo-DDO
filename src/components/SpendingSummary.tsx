import type { Expense, ExpenseCategory } from '../data'
import { formatCLP } from '../data'

const colors = ['mint', 'pink', 'violet', 'amber']

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
  const total = totals.reduce((sum, category) => sum + category.total, 0)
  const smallPurchases = totals.find((category) => category.label === 'Compras pequeñas')?.total ?? 0

  return (
    <section className="surface spending-panel" aria-labelledby="spending-title">
      <div className="section-heading">
        <div>
          <h2 id="spending-title">En qué se fue la plata</h2>
        </div>
        <span className="month-label">{monthLabel}</span>
      </div>

      <div className="spend-stack" role="img" aria-label={'Total gastado: ' + formatCLP(total)}>
        {totals.filter((category) => category.total > 0).map((category) => (
          <span className={category.color} key={category.id} style={{ flexGrow: category.total }} />
        ))}
      </div>

      <div className="small-spend-highlight">
        <div>
          <strong>{formatCLP(smallPurchases)}</strong>
          <span>en compras pequeñas</span>
        </div>
      </div>

      <ul className="category-list">
        {totals.map((category) => (
          <li className="category-row" key={category.id}>
            <span className="category-label">
              <span className={'category-dot ' + category.color} aria-hidden="true" />
              {category.label}
            </span>
            <span className="category-amount">{formatCLP(category.total)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
