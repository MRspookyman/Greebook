import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { waitingFor } from '@/lib/slips'
import { usePeople } from '@/session'
import { BookOpen, Flame, Plus, Spines } from './icons'

const CORNERS: Array<[string, string?]> = [['/'], ['/mesilla', 'rincon-mesilla'], ['/estanteria', 'rincon-estanteria']]
const ROOM: Record<string, true> = { '/': true, '/mesilla': true, '/estanteria': true }

/** The way around the room: one short screen for each thing, always one touch away. */
export function Nav() {
  const { db, me } = usePeople()
  const { pathname, key } = useLocation()
  const room = CORNERS.some(([path]) => path === pathname)
  // In the room the three shortcuts are corners of one page: the lit one is where the scroll is.
  const [corner, setCorner] = useState('/')
  useEffect(() => {
    if (!room) return
    const read = () => {
      const line = window.innerHeight * 0.45
      const bottom = window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      let now = '/'
      for (const [path, id] of CORNERS) {
        const top = id && document.getElementById(id)?.getBoundingClientRect().top
        if (typeof top === 'number' && (top <= line || bottom)) now = path
      }
      setCorner(now)
    }
    const frame = requestAnimationFrame(read)
    window.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', read)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', read)
      window.removeEventListener('resize', read)
    }
  }, [room, key])
  const waiting = useMemo(() => waitingFor(db, me.id).length, [db, me.id])
  // The evening is the candle and nothing else.
  if (pathname === '/velada') return null

  const item = (to: string, label: string, icon: ReactNode, badge = false) => {
    // The three corners of the room light up by where the scroll is; the other two by the screen you are on.
    const active = room && to in ROOM ? to === corner : !room && pathname === to
    return (
    <Link
      to={to}
      aria-current={active ? (to in ROOM ? 'location' : 'page') : undefined}
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
