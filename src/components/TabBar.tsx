import { NavLink } from 'react-router'
import { BarChart3, Heart, Library, Plus, Sun, type LucideIcon } from 'lucide-react'
import { useUsUnread } from '@/features/us/unread'

const LEFT: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Hoy', icon: Sun },
  { to: '/biblioteca', label: 'Biblioteca', icon: Library },
]
const RIGHT: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/stats', label: 'Stats', icon: BarChart3 },
  { to: '/nosotros', label: 'Nosotros', icon: Heart },
]

function Tab({ to, label, icon: Icon, badge = 0 }: { to: string; label: string; icon: LucideIcon; badge?: number }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex min-h-[52px] flex-col items-center justify-center gap-[3px] text-[10.5px] font-medium transition-colors ${isActive ? 'text-accent' : 'text-muted'}`
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative">
            <Icon
              size={23}
              strokeWidth={1.8}
              style={{
                transform: isActive ? 'translateY(-2px) scale(1.08)' : 'none',
                transition: 'transform 0.35s var(--spring)',
              }}
            />
            {badge > 0 && !isActive && (
              <span
                className="num absolute -top-1.5 -right-2.5 grid h-[17px] min-w-[17px] place-items-center rounded-full border-2 border-surface bg-danger px-1 text-[10px] font-bold text-white"
                style={{ animation: 'gb-pop .5s var(--spring)' }}
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

/** Hoy · Biblioteca · + · Stats · Nosotros. The central + registers a session from anywhere. */
export function TabBar({ onAdd }: { onAdd: () => void }) {
  const unread = useUsUnread()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 pb-safe backdrop-blur-md">
      <div className="mx-auto grid max-w-xl grid-cols-5 items-center px-2.5 pt-1.5">
        {LEFT.map((t) => (
          <Tab key={t.to} {...t} />
        ))}
        <button
          type="button"
          onClick={onAdd}
          aria-label="Registrar sesión"
          className="-mt-6 grid h-[54px] w-[54px] place-items-center justify-self-center rounded-[18px] bg-accent text-surface shadow-[0_10px_22px_-8px_var(--accent)] transition-transform duration-300 [transition-timing-function:var(--spring)] active:scale-90"
        >
          <Plus size={26} />
        </button>
        {RIGHT.map((t) => (
          <Tab key={t.to} {...t} badge={t.to === '/nosotros' ? unread : 0} />
        ))}
      </div>
    </nav>
  )
}
