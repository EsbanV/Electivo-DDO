import { useEffect, useRef } from 'react'
import { animate } from 'motion'
import { formatCLP } from '../data'

// Muestra un monto en pesos y lo hace "contar" desde el valor anterior hasta el nuevo.
export function AnimatedAmount({ value }: { value: number }) {
  const texto = useRef<HTMLSpanElement>(null)
  const anterior = useRef(0)

  useEffect(() => {
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const animacion = animate(anterior.current, value, {
      duration: sinMovimiento ? 0 : 0.9,
      ease: 'easeOut',
      onUpdate: (n) => {
        if (texto.current) texto.current.textContent = formatCLP(Math.round(n))
      },
    })
    anterior.current = value
    return () => animacion.stop()
  }, [value])

  return <span ref={texto}>{formatCLP(value)}</span>
}
