import type { Expense, ExpenseCategory } from '../data'
import { motion } from 'motion/react'
import { formatCLP } from '../data'

const colors = ['aqua', 'sky', 'violet', 'coral']
const tonos: Record<string, string> = { aqua: '#4de0c4', sky: '#6fb4ff', violet: '#9d94ff', coral: '#ff9b7d' }

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

      <div className="spend-body">
        <Dona categorias={totals} total={total} />
        <div className="spend-side">
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
        </div>
      </div>
    </section>
  )
}

// Dona SVG: cada categoría es un arco que se dibuja al cargar. El radio 15.9155 hace que la circunferencia mida 100.
function Dona({ categorias, total }: { categorias: { id: string; color: string; total: number }[]; total: number }) {
  const conGasto = categorias.filter((categoria) => categoria.total > 0)
  const arcos = conGasto.map((categoria, indice) => ({
    ...categoria,
    largo: (categoria.total / total) * 100,
    inicio: conGasto.slice(0, indice).reduce((suma, anterior) => suma + (anterior.total / total) * 100, 0),
  }))
  return (
    <div className="donut" role="img" aria-label={'Total gastado: ' + formatCLP(total)}>
      <svg viewBox="0 0 42 42">
        <circle className="donut-track" cx="21" cy="21" r="15.9155" />
        {arcos.map((arco) => (
          <motion.circle
            key={arco.id}
            cx="21" cy="21" r="15.9155"
            stroke={tonos[arco.color]}
            strokeDashoffset={-arco.inicio}
            initial={{ strokeDasharray: '0 100' }}
            animate={{ strokeDasharray: Math.max(arco.largo - 1.2, 0) + ' 100' }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        ))}
      </svg>
      <div className="donut-center">
        <strong>{formatCLP(total)}</strong>
        <span>gastado</span>
      </div>
    </div>
  )
}
