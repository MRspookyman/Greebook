import { useMemo, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { waitingFor } from '@/lib/slips'
import { usePeople } from '@/session'
import { BookOpen, Flame, Plus, Spines } from './icons'

/** The way around the room: one short screen for each thing, always one touch away. */
export function Nav() {
  const { db, me } = usePeople()
  const { pathname } = useLocation()
  const waiting = useMemo(() => waitingFor(db, me.id).length, [db, me.id])
  // The evening is the candle and nothing else.
  if (pathname === '/velada') return null

  const item = (to: string, label: string, icon: ReactNode, badge = false) => {
    const active = pathname === to
    return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={`relative flex min-h-[54px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[16px] text-[12.5px] transition-colors ${
        active ? 'bg-ink/10 font-semibold text-ink' : 'text-muted'
      }`}
    >
      <span className="relative">
        {icon}
        {badge && <span aria-hidden="true" className="absolute -top-0.5 -right-1.5 h-2.5 w-2.5 rounded-full bg-flame" />}
      </span>
      {label}
      {badge && <span className="sr-only">, hay algo esperándote</span>}
    </Link>
    )
  }

  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule"
      style={{
        background: 'color-mix(in oklab, var(--bg) 92%, transparent)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="mx-auto flex max-w-xl gap-1 px-2 py-1.5">
        {item('/', 'Velas', <Flame size={22} />, waiting > 0)}
        {item('/mesilla', 'Mesilla', <BookOpen size={22} />)}
        {item('/estanteria', 'Estantería', <Spines size={22} />)}
        {item('/anadir', 'Añadir', <Plus size={22} />)}
        {item(
          '/ajustes',
          'Tú',
          <span className="grid h-[22px] w-[22px] place-items-center rounded-full text-[12px] font-semibold text-[#22201a]" style={{ background: 'var(--me)' }}>
            {me.name.charAt(0).toUpperCase()}
          </span>,
        )}
      </div>
    </nav>
  )
}
