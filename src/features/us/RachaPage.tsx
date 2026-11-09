import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { addDays } from 'date-fns'
import { ArrowLeft, ChevronDown, Heart, Moon } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { useMe } from '@/features/auth/me'
import { fmt, fromISODate, toISODate } from '@/lib/dates'
import { WILDCARDS_PER_MONTH } from '@/lib/stats/streak'
import { formatDays } from '@/lib/units'
import { useCouple } from './useCouple'

const LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function LampArt() {
  return (
    <div className="relative h-[120px] w-[104px] flex-none" aria-hidden>
      <span className="lamp-glow absolute inset-0 rounded-full" />
      <svg width="104" height="120" viewBox="0 0 104 120" className="relative">
        <path d="M24 50h56l18 58H6z" fill="var(--lamp-strong)" opacity=".55" />
        <rect x="49" y="50" width="6" height="48" rx="3" fill="var(--plum)" />
        <rect x="28" y="96" width="48" height="10" rx="5" fill="var(--plum)" />
        <path
          d="M32 16h40l14 36H18z"
          fill="var(--amber)"
          stroke="var(--amber-ink)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

/** The streak of both of you: the number, six weeks of stamps, each one's own streak and the rules in sight. */
export function RachaPage() {
  const { profile, partner } = useMe()
  const c = useCouple()
  const { streak } = c
  const month = c.today.slice(0, 7)
  const monthBoth = [...c.mineDates].filter((d) => d.startsWith(month) && c.theirDates.has(d)).length
  const daysSoFar = Number(c.today.slice(8, 10))
  // Six weeks ending this Sunday, Monday first.
  const todayDate = fromISODate(c.today)
  const monday = addDays(todayDate, -((todayDate.getDay() + 6) % 7) - 35)
  const days = Array.from({ length: 42 }, (_, i) => toISODate(addDays(monday, i)))
  const name = partner?.display_name ?? 'tu pareja'
  const pendingLine = !partner
    ? ''
    : !streak.todayPending
      ? 'Hoy ya habéis leído los dos: la lámpara sigue encendida.'
      : c.theirDates.has(c.today)
        ? `${name} ya ha leído hoy. Con un ratito tuyo, la racha sube a ${streak.current + 1}.`
        : c.mineDates.has(c.today)
          ? `Ya has leído hoy. Cuando lea ${name}, la racha sube a ${streak.current + 1}.`
          : 'Hoy aún no habéis leído. La racha no se rompe hasta que acabe el día.'
  return (
    <div className="space-y-7">
      <Link to="/nosotros" className="btn btn-link -my-2 -ml-1 px-1 no-underline">
        <ArrowLeft size={19} aria-hidden /> Nosotros
      </Link>
      <header className="enter flex items-center gap-5">
        <LampArt />
        <div>
          <p className="font-serif text-[58px] leading-[0.95] tabular-nums">
            {streak.current} <span className="text-[22px]">{streak.current === 1 ? 'día' : 'días'}</span>
          </p>
          <h1 className="text-[21px]">leyendo los dos</h1>
        </div>
      </header>
      <p>{pendingLine}</p>
      <div className="grid grid-cols-3 gap-2">
        {[
          [String(streak.best), 'días, vuestra mejor racha'],
          [`${monthBoth} de ${daysSoFar}`, `días de ${fmt(c.today, 'MMMM')} leyendo los dos`],
          [`${streak.wildcardsThisMonth} de ${WILDCARDS_PER_MONTH}`, 'comodines usados este mes'],
        ].map(([value, label]) => (
          <div key={label} className="card grid content-start gap-0.5 p-3">
            <b className="font-serif text-2xl font-normal leading-tight">{value}</b>
            <span className="text-[12.5px] leading-snug text-muted">{label}</span>
          </div>
        ))}
      </div>
      <section className="space-y-3" aria-labelledby="semanas">
        <h2 id="semanas">Últimas seis semanas</h2>
        <div className="grid grid-cols-7 justify-items-center gap-x-1 gap-y-2" role="list">
          {LETTERS.map((letter) => (
            <span key={letter} className="text-xs font-extrabold text-muted" aria-hidden>
              {letter}
            </span>
          ))}
          {days.map((date, index) => {
            const me = c.mineDates.has(date)
            const you = c.theirDates.has(date)
            const free = streak.wildcards.has(date)
            const future = date > c.today
            const who = me ? profile : partner
            const text =
              me && you
                ? 'leísteis los dos'
                : free
                  ? 'comodín'
                  : me
                    ? 'solo leíste tú'
                    : you
                      ? `solo leyó ${name}`
                      : 'sin lectura'
            return (
              <span
                key={date}
                role="listitem"
                aria-label={`${fmt(date, "EEEE d 'de' MMMM")}: ${future ? 'aún no ha llegado' : text}`}
                className={`stamp h-[34px] w-[34px] ${me && you ? 'stamp-both' : free ? 'stamp-free' : me || you ? 'stamp-one' : ''} ${date === c.today && !(me && you) ? 'stamp-pending' : ''} ${future ? 'opacity-40' : ''}`}
                style={
                  {
                    '--rot': `${((index * 37) % 11) - 5}deg`,
                    '--pc': who ? `var(--${who.accent})` : undefined,
                  } as CSSProperties
                }
              >
                {free ? <Moon size={14} fill="currentColor" aria-hidden /> : fmt(date, 'd')}
              </span>
            )
          })}
        </div>
        {partner && (
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] font-bold text-muted">
            <span className="flex items-center gap-1 text-rose">
              <Heart size={12} fill="currentColor" aria-hidden /> Los dos
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--${partner.accent})` }} /> Solo {name}
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--${profile.accent})` }} /> Solo tú
            </span>
            <span className="flex items-center gap-1 text-amber-ink">
              <Moon size={12} fill="currentColor" aria-hidden /> Comodín
            </span>
          </p>
        )}
      </section>
      {partner && (
        <section className="space-y-3" aria-labelledby="cada-uno">
          <h2 id="cada-uno">Cada uno</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { person: partner, value: c.theirStreak, label: name },
              { person: profile, value: c.myStreak, label: 'Tú' },
            ].map(({ person, value, label }) => (
              <div key={label} className="card flex items-center gap-3 p-3.5">
                <Avatar person={person} size={36} />
                <p>
                  <b className="font-extrabold">{formatDays(value)}</b>
                  <br />
                  <span className="text-sm text-muted">{label}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
      <details className="group rounded-[20px] bg-sunk px-4">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between font-extrabold">
          Cómo funciona <ChevronDown size={18} className="transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <ul className="list-disc space-y-2 pb-4 pl-5 text-sm">
          <li>Un día cuenta cuando leéis los dos, cada uno según su fecha.</li>
          <li>Tenéis {WILDCARDS_PER_MONTH} comodines al mes: si un día solo lee uno, se usa solo y la racha sigue.</li>
          <li>Si un día no lee ninguno, vuelve a empezar. La mejor racha se queda guardada.</li>
          <li>Hoy nunca rompe la racha: tenéis hasta el final del día.</li>
          <li>Cada uno ve también su racha, sin comparar quién va mejor.</li>
        </ul>
      </details>
    </div>
  )
}
