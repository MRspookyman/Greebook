import { Link, useLocation } from 'react-router'
import { BarChart3, BookOpen, Heart, Library, Sun, type LucideIcon } from 'lucide-react'
import { usePendingForMe } from '@/features/us/messages'
import { useActiveTimer, useElapsedSeconds } from '@/features/session/Timer'
import { formatClock, spokenClock } from '@/lib/timer'

interface TabItem {
  to: string
  label: string
  icon: LucideIcon
  /** Column in the five-slot bar (2 is the central «Leer»). */
  column: number
  match: (path: string) => boolean
}

const TABS: TabItem[] = [
  { to: '/', label: 'Hoy', icon: Sun, column: 0, match: (path) => path === '/' },
  {
    to: '/biblioteca',
    label: 'Biblioteca',
    icon: Library,
    column: 1,
    match: (path) => path.startsWith('/biblioteca') || path.startsWith('/libro'),
  },
  { to: '/stats', label: 'Estadísticas', icon: BarChart3, column: 3, match: (path) => path.startsWith('/stats') },
  {
    to: '/nosotros',
    label: 'Nosotros',
    icon: Heart,
    column: 4,
    match: (path) => path.startsWith('/nosotros') || path.startsWith('/sala'),
  },
]

function Tab({ tab, active, badge = 0 }: { tab: TabItem; active: boolean; badge?: number }) {
  const Icon = tab.icon
  return (
    <Link
      to={tab.to}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-[52px] flex-col items-center justify-center gap-[3px] text-xs font-medium transition-colors duration-200 ${active ? 'text-accent' : 'text-muted'}`}
    >
      <span className="relative">
        <Icon
          aria-hidden
          size={23}
          strokeWidth={1.5}
          className="transition-transform duration-300"
          style={{ transform: active ? 'translateY(-1px)' : undefined }}
        />
        {badge > 0 && (
          <span
            className="num absolute -top-1.5 -right-2.5 grid h-[20px] min-w-[20px] place-items-center rounded-full border-2 border-surface bg-danger px-1 text-xs font-bold text-surface"
            style={{ animation: 'gb-pop-in 320ms var(--ease) both' }}
            aria-label={`${badge} novedades`}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      {tab.label}
    </Link>
  )
}

/** Central action: opens «Leer»; while a timer runs it shows the time and a ring for the minute. */
function ReadButton() {
  const timer = useActiveTimer()
  const seconds = useElapsedSeconds(timer)
  const paused = timer?.pausedAt != null
  const r = 18
  const circumference = 2 * Math.PI * r
  return (
    <Link
      to={timer ? `/leer/${timer.readingId}` : '/leer'}
      aria-label={
        timer ? `Volver a tu sesión: ${spokenClock(seconds)}${paused ? ', en pausa' : ''}` : 'Leer o apuntar páginas'
      }
      // Raised: the circle rises above the bar while its label lines up with the other tabs.
      className="pressable -mt-[17px] flex min-h-[52px] flex-col items-center justify-center gap-[3px] text-xs font-medium text-accent"
    >
      <span
        className={`relative grid h-[40px] w-[40px] place-items-center rounded-full border border-accent transition-colors duration-300 ${timer && !paused ? 'bg-accent text-[var(--accent-contrast)]' : 'bg-bg'}`}
      >
        <BookOpen aria-hidden size={20} strokeWidth={1.5} />
        {timer && (
          <svg className="absolute -inset-[5px] -rotate-90" viewBox="0 0 42 42" aria-hidden>
            <circle
              cx="21"
              cy="21"
              r={r}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - (seconds % 60) / 60)}
              style={{ transition: seconds % 60 === 0 ? 'none' : 'stroke-dashoffset 1s linear' }}
            />
          </svg>
        )}
      </span>
      <span className={timer ? 'num' : undefined}>{timer ? formatClock(seconds) : 'Leer'}</span>
    </Link>
  )
}

/** Hoy · Biblioteca · Leer · Estadísticas · Nosotros, with a hairline that slides to the active tab. */
export function TabBar() {
  const { count: unread } = usePendingForMe()
  const { pathname } = useLocation()
  const current = TABS.find((tab) => tab.match(pathname))
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-bg pb-safe" aria-label="Secciones">
      <div className="relative mx-auto grid h-[58px] max-w-xl grid-cols-5 items-center px-2.5 pt-1.5">
        <span
          aria-hidden
          className="pointer-events-none absolute top-[-1px] left-2.5 flex h-[2px] w-[calc((100%-20px)/5)] justify-center"
          style={{
            transform: `translateX(${(current?.column ?? 0) * 100}%)`,
            opacity: current ? 1 : 0,
            transition: 'transform var(--dur-move) var(--ease), opacity var(--dur-move) var(--ease)',
          }}
        >
          <span className="h-full w-7 rounded-full bg-accent" />
        </span>
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
