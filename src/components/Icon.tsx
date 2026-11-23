import { ArrowRight, CalendarCheck, Check, ChevronLeft, ChevronRight, Plus, Wallet, X } from 'lucide-react'

// Los nombres que usa la app apuntan a íconos de Lucide.
const icons = {
  wallet: Wallet,
  calendar: CalendarCheck,
  plus: Plus,
  check: Check,
  close: X,
  arrow: ArrowRight,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
}

export function Icon({ name, size = 20 }: { name: keyof typeof icons; size?: number }) {
  const Componente = icons[name]
  return <Componente aria-hidden="true" size={size} strokeWidth={1.8} />
}
