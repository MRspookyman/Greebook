import { NavLink } from 'react-router'
import { CalendarDays, Heart, Library, Sun, User, type LucideIcon } from 'lucide-react'

const TABS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Hoy', icon: Sun },
  { to: '/biblioteca', label: 'Biblioteca', icon: Library },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/nosotros', label: 'Nosotros', icon: Heart },
  { to: '/perfil', label: 'Perfil', icon: User },
]

export function TabBar() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-border pb-safe">
      <ul className="flex max-w-xl mx-auto">
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 min-h-[52px] text-[11px] font-medium ${isActive ? 'text-accent' : 'text-muted'}`
              }
            >
              <Icon size={22} strokeWidth={1.8} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
