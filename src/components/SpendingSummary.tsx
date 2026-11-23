import type { Expense, ExpenseCategory } from '../data'
import { useState } from 'react'
import { motion } from 'motion/react'
import { Paginador } from './Paginador'
import { formatCLP } from '../data'
import { InfoTip } from './InfoTip'

const CATEGORIAS_POR_PAGINA = 4
const colors = ['aqua', 'sky', 'violet', 'coral', 'cyan', 'orchid']

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
  const [pagina, setPagina] = useState(0)
  const total = totals.reduce((sum, category) => sum + category.total, 0)
  const smallPurchases = totals.find((category) => category.label === 'Compras pequeñas')?.total ?? 0

  // Las categorías con más gasto van primero.
  const ordenadas = [...totals].sort((a, b) => b.total - a.total)
  const totalPaginas = Math.ceil(ordenadas.length / CATEGORIAS_POR_PAGINA)
  const paginaActual = Math.min(pagina, Math.max(totalPaginas - 1, 0))
  const categoriasDePagina = ordenadas.slice(paginaActual * CATEGORIAS_POR_PAGINA, (paginaActual + 1) * CATEGORIAS_POR_PAGINA)

  return (
    <section className="surface spending-panel" aria-labelledby="spending-title">
      <div className="section-heading">
        <div>
          <h2 id="spending-title">En qué se fue la plata</h2>
          <InfoTip text="Muestra cuánto gastaste este mes en cada categoría y qué porcentaje representa del total." />
        </div>
        <span className="month-label">{monthLabel}</span>
      </div>

      <div className="small-spend-highlight">
        <strong>{formatCLP(total)}</strong>
        <span>gastado este mes, {formatCLP(smallPurchases)} en compras pequeñas</span>
      </div>

      <ul className="category-list">
        {categoriasDePagina.map((category) => (
          <li className="category-row" key={category.id}>
            <div className="category-head">
              <span className="category-label">
                <span className={'category-dot ' + category.color} aria-hidden="true" />
                {category.label}
              </span>
              <span className="category-amount">
                {formatCLP(category.total)}
                <small>{total > 0 ? Math.round((category.total / total) * 100) : 0}%</small>
              </span>
            </div>
            <div className="category-track">
              <motion.span
                className={category.color}
                initial={{ width: 0 }}
                animate={{ width: (total > 0 ? (category.total / total) * 100 : 0) + '%' }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </li>
        ))}
      </ul>
      <Paginador pagina={paginaActual} totalPaginas={totalPaginas} onCambiar={setPagina} />
    </section>
  )
}
