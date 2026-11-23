import { Info } from 'lucide-react'

// Ícono "i" que explica para qué sirve una tarjeta. Se abre al pasar el mouse o al enfocar/tocar el botón (solo CSS).
export function InfoTip({ text }: { text: string }) {
  return (
    <span className="info-tip">
      <button className="info-button" type="button" aria-label="Qué hace esta tarjeta">
        <Info aria-hidden="true" size={16} strokeWidth={1.8} />
      </button>
      <span className="info-text" role="tooltip">{text}</span>
    </span>
  )
}
