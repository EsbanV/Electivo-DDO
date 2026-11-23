import { Icon } from './Icon'

// Controles "‹ 2 de 3 ›". No se muestra si todo cabe en una sola página.
export function Paginador({ pagina, totalPaginas, onCambiar }: {
  pagina: number
  totalPaginas: number
  onCambiar: (pagina: number) => void
}) {
  if (totalPaginas < 2) return null
  return (
    <nav className="pager" aria-label="Paginación">
      <button type="button" aria-label="Página anterior" disabled={pagina === 0} onClick={() => onCambiar(pagina - 1)}>
        <Icon name="chevron-left" size={16} />
      </button>
      <span>{pagina + 1} de {totalPaginas}</span>
      <button type="button" aria-label="Página siguiente" disabled={pagina === totalPaginas - 1} onClick={() => onCambiar(pagina + 1)}>
        <Icon name="chevron-right" size={16} />
      </button>
    </nav>
  )
}
