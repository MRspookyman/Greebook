import { Link, useLocation } from 'react-router'
import { BookOpen, Heart, Library, NotebookPen, Sun, type LucideIcon } from 'lucide-react'
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
    label: 'Estantería',
    icon: Library,
    column: 1,
    match: (path) => path.startsWith('/biblioteca') || path.startsWith('/libro'),
  },
  { to: '/diario', label: 'Diario', icon: NotebookPen, column: 3, match: (path) => path.startsWith('/diario') },
  {
    to: '/nosotros',
    label: 'Nosotros',
    icon: Heart,
    column: 4,
    match: (path) => path.startsWith('/nosotros'),
  },
]

function Tab({ tab, active, badge = 0 }: { tab: TabItem; active: boolean; badge?: number }) {
  const Icon = tab.icon
  return (
    <Link
      to={tab.to}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-[52px] flex-col items-center justify-end gap-[3px] text-xs font-medium transition-colors duration-200 ${active ? 'text-chrome-ink' : 'text-chrome-muted'}`}
    >
      <span className="relative">
        <Icon
          aria-hidden
          size={22}
          strokeWidth={1.6}
          className="transition-transform duration-300"
          style={{ transform: active ? 'translateY(-1px)' : undefined }}
        />
        {badge > 0 && (
          <span
            className="absolute -top-1.5 -right-3 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-chrome-mark px-1 text-xs leading-none font-semibold text-chrome"
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
  const r = 30
  const circumference = 2 * Math.PI * r
  return (
    <Link
      to={timer ? `/leer/${timer.readingId}` : '/leer'}
      aria-label={
        timer ? `Volver a tu sesión: ${spokenClock(seconds)}${paused ? ', en pausa' : ''}` : 'Leer o apuntar páginas'
      }
      // Raised: the circle rises above the bar while its label lines up with the other tabs.
      className="pressable flex min-h-[52px] flex-col items-center justify-end gap-[3px] text-xs font-medium text-chrome-ink"
    >
      <span
        className="relative -mt-[30px] grid h-[56px] w-[56px] place-items-center rounded-full transition-colors duration-300"
        style={{
          background: timer && !paused ? 'var(--accent)' : 'color-mix(in oklab, var(--chrome) 84%, white)',
          color: timer && !paused ? 'var(--accent-contrast)' : 'var(--chrome-mark)',
          boxShadow: '0 0 0 4px var(--bg), inset 0 0 0 1.5px var(--chrome-mark)',
        }}
      >
        <BookOpen aria-hidden size={24} strokeWidth={1.6} />
        {timer && (
          <svg className="absolute -inset-[4px] -rotate-90" viewBox="0 0 64 64" aria-hidden>
            <circle
              cx="32"
              cy="32"
              r={r}
              fill="none"
              stroke="var(--chrome-mark)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - (seconds % 60) / 60)}
              style={{ transition: seconds % 60 === 0 ? 'none' : 'stroke-dashoffset 1s linear' }}
            />
          </svg>
        )}
      </span>
      <span className={timer ? '[font-variant-numeric:tabular-nums]' : undefined}>
        {timer ? formatClock(seconds) : 'Leer'}
      </span>
    </Link>
  )
}

/** Hoy · Estantería · Leer · Diario · Nosotros: a floating bar with a mark that slides to the active tab. */
export function TabBar() {
  const { count: unread } = usePendingForMe()
  const { pathname } = useLocation()
  const current = TABS.find((tab) => tab.match(pathname))
  return (
    <nav
      className="fixed inset-x-0 z-30 px-3"
      style={{ bottom: 'calc(10px + env(safe-area-inset-bottom))' }}
      aria-label="Secciones"
    >
      <div className="relative mx-auto grid h-[64px] max-w-xl grid-cols-5 items-end rounded-[24px] bg-chrome px-1 pb-[7px] shadow-[0_14px_30px_-12px_rgb(15_26_21/0.55)]">
        <span
          aria-hidden
          className="pointer-events-none absolute top-[7px] left-1 flex h-[2px] w-[calc((100%-8px)/5)] justify-center"
          style={{
            transform: `translateX(${(current?.column ?? 0) * 100}%)`,
            opacity: current ? 1 : 0,
            transition: 'transform var(--dur-move) var(--ease), opacity var(--dur-move) var(--ease)',
          }}
        >
          <span className="h-full w-5 rounded-full bg-chrome-mark" />
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
