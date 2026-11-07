import { NavLink } from 'react-router'
import { BarChart3, Heart, Library, Plus, Sun, type LucideIcon } from 'lucide-react'
import { usePendingForMe } from '@/features/us/messages'

const LEFT: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Hoy', icon: Sun },
  { to: '/biblioteca', label: 'Biblioteca', icon: Library },
]
const RIGHT: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/stats', label: 'Estadísticas', icon: BarChart3 },
  { to: '/nosotros', label: 'Nosotros', icon: Heart },
]

function Tab({ to, label, icon: Icon, badge = 0 }: { to: string; label: string; icon: LucideIcon; badge?: number }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex min-h-[52px] flex-col items-center justify-center gap-[3px] text-xs font-medium transition-colors ${isActive ? 'text-accent' : 'text-muted'}`
      }
    >
      {() => (
        <>
          <span className="relative">
            <Icon aria-hidden size={23} strokeWidth={1.5} />
            {badge > 0 && (
              <span
                className="num absolute -top-1.5 -right-2.5 grid h-[20px] min-w-[20px] place-items-center rounded-full border-2 border-surface bg-danger px-1 text-xs font-bold text-surface"
                style={{ animation: 'gb-pop 140ms var(--ease)' }}
                aria-label={`${badge} novedades`}
              >
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </span>
          {label}
        </>
      )}
    </NavLink>
  )
}

/** Hoy · Biblioteca · + · Estadísticas · Nosotros. */
export function TabBar({ onAdd }: { onAdd: () => void }) {
  const { count: unread } = usePendingForMe()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-bg pb-safe">
      <div className="mx-auto grid max-w-xl grid-cols-5 items-center px-2.5 pt-1.5">
        {LEFT.map((t) => (
          <Tab key={t.to} {...t} />
        ))}
        <button
          type="button"
          onClick={onAdd}
          aria-label="Abrir acciones"
          className="pressable grid h-[46px] w-[46px] place-items-center justify-self-center rounded-full border border-accent bg-transparent text-accent"
        >
          <Plus size={24} strokeWidth={1.5} aria-hidden />
        </button>
        {RIGHT.map((t) => (
          <Tab key={t.to} {...t} badge={t.to === '/nosotros' ? unread : 0} />
        ))}
      </div>
    </nav>
  )
}
