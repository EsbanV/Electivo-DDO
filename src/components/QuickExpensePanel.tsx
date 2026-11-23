import { useState } from 'react'
import type { FormEvent } from 'react'
import { formatCLP, type QuickExpensePreset } from '../data'
import { Icon } from './Icon'

type QuickExpensePanelProps = {
  presets: QuickExpensePreset[]
  onAdd: (expense: { label: string; amount: number; categoryId: string; presetId: string }) => Promise<void>
}

export function QuickExpensePanel({ presets, onAdd }: QuickExpensePanelProps) {
  const [selectedId, setSelectedId] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const selected = presets.find((item) => item.id === selectedId) ?? presets[0]

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedAmount = Number(amount)
    if (!selected || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setMessage('Elige un gasto e ingresa un monto mayor que cero.')
      return
    }

    setIsSaving(true)
    setMessage('')
    try {
      await onAdd({ label: selected.label, amount: parsedAmount, categoryId: selected.categoryId, presetId: selected.id })
      setMessage(selected.label + ' guardado: ' + formatCLP(parsedAmount))
      setAmount('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos guardar el gasto.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="surface quick-panel" aria-labelledby="quick-title">
      <div className="section-heading">
        <div>
          <h2 id="quick-title">Anota un gasto</h2>
        </div>
        <span className="decorative-icon"><Icon name="sparkle" size={20} /></span>
      </div>
      <p className="section-description">Elige qué fue y escribe el monto.</p>

      <div className="quick-choices" role="group" aria-label="Tipo de gasto">
        {presets.map((item) => (
          <button
            className={'quick-choice' + (selected?.id === item.id ? ' selected' : '')}
            key={item.id}
            type="button"
            aria-pressed={selected?.id === item.id}
            onClick={() => {
              setSelectedId(item.id)
              setMessage('')
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form className="quick-form" onSubmit={submitExpense}>
        <label className="sr-only" htmlFor="expense-amount">Monto del gasto</label>
        <span className="input-prefix" aria-hidden="true">$</span>
        <input
          id="expense-amount"
          inputMode="numeric"
          type="number"
          min="1"
          step="1"
          placeholder="Monto"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value)
            setMessage('')
          }}
          required
          disabled={!selected || isSaving}
        />
        <button className="button button-primary save-expense" type="submit" disabled={!selected || isSaving}>
          {isSaving ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
      <p className="form-message" aria-live="polite">{message || (presets.length ? 'Queda agrupado por categoría.' : 'No hay accesos rápidos configurados.')}</p>
    </section>
  )
}
