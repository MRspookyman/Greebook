import { useMemo, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { mailbox } from '@/lib/slips'
import { usePeople } from '@/session'
import { BookOpen, Flame, Paper, Spines } from './icons'

/** Five familiar places, with the active section marked on its icon. */
export function Nav() {
  const { db, me } = usePeople()
  const { pathname } = useLocation()
  const waiting = useMemo(() => mailbox(db, me.id).reduce((sum, bundle) => sum + bundle.unread, 0), [db, me.id])
  if (pathname === '/velada') return null

  const item = (to: string, label: string, icon: ReactNode, badge = false) => (
    <Link to={to} aria-current={pathname === to ? 'page' : undefined} className="app-nav-item">
      <span className="app-nav-icon">
        {icon}
        {badge && <span aria-hidden className="app-nav-badge" />}
      </span>
      <span>{label}</span>
      {badge && <span className="sr-only">, hay algo por leer</span>}
    </Link>
  )
  return (
    <nav aria-label="Secciones" className="app-nav">
      <div className="app-nav-inner">
        {item('/', 'Velas', <Flame size={22} />)}
        {item('/mesilla', 'Mesita', <BookOpen size={22} />)}
        {item('/estanteria', 'Estantería', <Spines size={22} />)}
        {item('/notas', 'Notas', <Paper size={22} />, waiting > 0)}
        {item(
          '/ajustes',
          'Tú',
          <span className="app-nav-avatar" style={{ background: 'var(--me)' }}>
            {me.name.charAt(0).toUpperCase()}
          </span>,
        )}
      </div>
    </nav>
  )
}
