import { Link, useLocation } from 'react-router'
import { BarChart3, BookOpen, Heart, House, Library, type LucideIcon } from 'lucide-react'
import { useMe } from '@/features/auth/me'
import { usePendingForMe } from '@/features/us/messages'
import { useActiveTimer, useElapsedSeconds } from '@/features/session/Timer'
import { formatClock, spokenClock } from '@/lib/timer'
import { isPartnerReading } from '@/lib/presence'

interface TabItem {
  to: string
  label: string
  icon: LucideIcon
  match: (path: string) => boolean
}

const TABS: TabItem[] = [
  { to: '/', label: 'Inicio', icon: House, match: (path) => path === '/' },
  {
    to: '/biblioteca',
    label: 'Biblioteca',
    icon: Library,
    match: (path) => path.startsWith('/biblioteca') || path.startsWith('/libro'),
  },
  { to: '/stats', label: 'Estadísticas', icon: BarChart3, match: (path) => path.startsWith('/stats') },
  {
    to: '/nosotros',
    label: 'Nosotros',
    icon: Heart,
    match: (path) => path.startsWith('/nosotros') || path.startsWith('/sala'),
  },
]

function Tab({ tab, active, badge = 0 }: { tab: TabItem; active: boolean; badge?: number }) {
  const Icon = tab.icon
  return (
    <Link
      to={tab.to}
      aria-current={active ? 'page' : undefined}
      className={`relative flex min-h-[52px] flex-col items-center justify-center gap-[3px] text-xs font-extrabold transition-colors duration-200 ${active ? 'text-ink' : 'text-muted'}`}
    >
      <span className="relative">
        <Icon aria-hidden size={24} strokeWidth={1.75} />
        {badge > 0 && (
          <span
            className="absolute -top-1.5 -right-2.5 grid h-[20px] min-w-[20px] place-items-center rounded-full bg-rose px-1 text-xs font-extrabold text-surface tabular-nums ring-2 ring-bg"
            style={{ animation: 'gb-pop-in 320ms var(--ease) both' }}
            aria-label={`${badge} novedades`}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      {tab.label}
      {active && <span aria-hidden className="absolute -bottom-1.5 h-[5px] w-[5px] rounded-full bg-rose" />}
    </Link>
  )
}

/**
 * Central action: opens «Leer». While a timer runs it shows the time; while your partner is reading it glows like a
 * lamp so joining them is one tap away.
 */
function ReadButton() {
  const { partner } = useMe()
  const timer = useActiveTimer()
  const seconds = useElapsedSeconds(timer)
  const paused = timer?.pausedAt != null
  const live = !timer && isPartnerReading(partner)
  const label = timer
    ? `Volver a tu sesión: ${spokenClock(seconds)}${paused ? ', en pausa' : ''}`
    : live
      ? `Leer. ${partner?.display_name} está leyendo ahora`
      : 'Leer o apuntar páginas'
  return (
    <Link
      to={timer ? `/leer/${timer.readingId}` : '/leer'}
      aria-label={label}
      className="pressable flex min-h-[52px] flex-col items-center justify-center gap-[3px] text-xs font-extrabold text-ink"
    >
      <span
        className={`relative -mt-7 grid h-[58px] w-[58px] place-items-center rounded-full bg-plum text-on-plum shadow-[0_0_0_5px_var(--bg),0_10px_20px_-8px_rgb(60_20_45/0.55)] ${live ? 'lamp-glow' : ''}`}
      >
        <BookOpen aria-hidden size={26} strokeWidth={1.75} />
        {live && (
          <span aria-hidden className="absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-amber ring-[2.5px] ring-bg" />
        )}
        {timer && !paused && <span aria-hidden className="live-dot absolute top-1 right-1 ring-2 ring-plum" />}
      </span>
      <span className={timer ? 'tabular-nums' : undefined}>{timer ? formatClock(seconds) : 'Leer'}</span>
    </Link>
  )
}

/** Inicio · Biblioteca · Leer · … · Nosotros, with a small rose dot under the active tab. */
export function TabBar() {
  const { count: unread } = usePendingForMe()
  const { pathname } = useLocation()
  const current = TABS.find((tab) => tab.match(pathname))
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-[color-mix(in_oklab,var(--bg)_86%,transparent)] pb-safe backdrop-blur-xl"
      aria-label="Secciones"
    >
      <div className="mx-auto grid h-[66px] max-w-xl grid-cols-5 items-start px-1.5 pt-2">
        {TABS.slice(0, 2).map((tab) => (
          <Tab key={tab.to} tab={tab} active={tab === current} />
        ))}
        <ReadButton />
        {TABS.slice(2).map((tab) => (
          <Tab key={tab.to} tab={tab} active={tab === current} badge={tab.to === '/nosotros' ? unread : 0} />
        ))}
      </div>
    </nav>
  )
}
