import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { BookOpen, ChevronRight, Coffee, Heart, Lamp, Library, Lock, Mail, Moon } from 'lucide-react'
import { BottomSheet } from '@/components/BottomSheet'
import { Cover } from '@/components/Cover'
import { Spine } from '@/components/Spine'
import { useMe } from '@/features/auth/me'
import { QuoteCard } from '@/features/quotes/QuoteCard'
import { WeekStamps } from '@/features/today/WeekStamps'
import { useTogether } from '@/lib/data'
import { fmt } from '@/lib/dates'
import { pagesEquivalent } from '@/lib/stats/aggregate'
import type { Accent, ReadingWithBook } from '@/lib/types'
import { formatDays } from '@/lib/units'
import { BlindRating } from './BlindRating'
import { TogetherCard } from './TogetherCard'
import { lovedQuote, milestones, monthLetter, monthName, type Milestone } from './together-stats'
import { useCouple } from './useCouple'

const NIGHTS_GOAL = 10
const ICONS: Record<Milestone['icon'], typeof Moon> = {
  moon: Moon,
  lamp: Lamp,
  heart: Heart,
  cup: Coffee,
  book: BookOpen,
  books: Library,
}

/** Nosotros: not statistics, what you share. Hours side by side, your shelf, your streak, your favourite words. */
export function UsPage() {
  const { userId, profile, partner } = useMe()
  const c = useCouple()
  const together = useTogether(!!partner).data ?? []
  const [letterOpen, setLetterOpen] = useState(false)
  if (!partner)
    return (
      <section className="space-y-4">
        <h1 className="display">Nosotros</h1>
        <p>Vuestro rincón estará aquí al vincular las dos cuentas.</p>
      </section>
    )
  const year = c.today.slice(0, 4)
  const month = c.today.slice(0, 7)
  const previous = (() => {
    const d = new Date(Number(year), Number(month.slice(5, 7)) - 2, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()
  const yearMinutes = c.rows
    .filter((r) => r.started_at.startsWith(year))
    .reduce((sum, r) => sum + (c.minutes.get(r.id) ?? 0), 0)
  const hours = yearMinutes / 60
  const monthNights = c.rows.filter((r) => r.started_at.startsWith(month) && c.minutes.has(r.id)).length
  const monthPages = c.sessions
    .filter((s) => s.read_on.startsWith(month))
    .reduce((sum, s) => {
      const reading = c.mineReadings.find((r) => r.id === s.reading_id) ?? c.theirReadings.find((r) => r.id === s.reading_id)
      return sum + (reading ? pagesEquivalent(s, reading) : 0)
    }, 0)
  const monthQuotes = c.quotes.filter((q) => q.created_at.startsWith(month) && q.shared).length
  const loved = lovedQuote(c.quotes, c.reactions, c.replies)
  // The year's shelf, one spine per book with a dot for each reader.
  const shelf = new Map<string, { reading: ReadingWithBook; readers: Accent[] }>()
  for (const [readings, accent] of [
    [c.theirReadings, partner.accent],
    [c.mineReadings, profile.accent],
  ] as const)
    for (const reading of readings)
      if (reading.status === 'finished' && reading.finished_on?.startsWith(year)) {
        const entry = shelf.get(reading.book_id)
        if (entry) entry.readers.push(accent)
        else shelf.set(reading.book_id, { reading, readers: [accent] })
      }
  const shelfBooks = [...shelf.values()].sort((a, b) =>
    (a.reading.finished_on ?? '').localeCompare(b.reading.finished_on ?? ''),
  )
  const readsThisYear = [...c.mineReadings, ...c.theirReadings].filter(
    (r) => r.status === 'finished' && r.finished_on?.startsWith(year),
  ).length
  const bothFinished = c.mineReadings
    .filter((r) => r.status === 'finished')
    .map((mine) => ({
      mine,
      theirs: c.theirReadings.find((t) => t.book_id === mine.book_id && t.status === 'finished'),
    }))
    .filter((pair): pair is { mine: ReadingWithBook; theirs: ReadingWithBook } => !!pair.theirs)
  const toRate = bothFinished.filter((pair) => pair.mine.rating === null || pair.theirs.rating === null)
  const goals = milestones({
    nightsTogether: c.minutes.size,
    hoursTogether: c.rows.reduce((sum, r) => sum + (c.minutes.get(r.id) ?? 0), 0) / 60,
    bestStreak: c.streak.best,
    duoFinished: bothFinished.length > 0,
    booksThisYear: readsThisYear,
    year,
  })
  const pending = together.filter(
    (item) => (!item.partner_answer && item.partner_id === userId) || (item.partner_answer === 'yes' && !item.start_on),
  )
  const firstDate = [...c.rows.map((r) => r.started_at.slice(0, 10)), ...c.sessions.map((s) => s.read_on)].sort()[0]
  const [first, second] = partner.is_gift_recipient ? [partner, profile] : [profile, partner]
  const letter = monthLetter({
    month: previous,
    me: profile,
    partner,
    sessions: c.sessions,
    readings: [...c.mineReadings, ...c.theirReadings],
    rows: c.rows,
    minutes: c.minutes,
    quotes: c.quotes,
    reactions: c.reactions,
    replies: c.replies,
  })

  return (
    <div className="space-y-8 pb-4">
      <header className="card enter relative px-5 py-6 text-center">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-2 rounded-[18px] border-[1.5px] border-[color-mix(in_oklab,var(--plum)_30%,transparent)]"
        />
        <p className="text-xs font-extrabold tracking-[0.2em] text-muted uppercase">Ex libris</p>
        <p className="my-1 font-serif text-[52px] leading-tight" aria-hidden>
          <span style={{ color: `var(--${first.accent})` }}>{first.display_name.charAt(0)}</span>
          <span className="font-[family-name:var(--font-book)] text-rose italic">&amp;</span>
          <span style={{ color: `var(--${second.accent})` }}>{second.display_name.charAt(0)}</span>
        </p>
        <h1 className="text-[21px]">
          {first.display_name} y {second.display_name}
        </h1>
        {firstDate && <p className="text-sm text-muted">Leyendo juntos desde {fmt(firstDate, "MMMM 'de' yyyy")}</p>}
      </header>

      {pending.length > 0 && (
        <section className="space-y-3" aria-labelledby="para-ti">
          <h2 id="para-ti">Para ti</h2>
          {pending.map((item) => (
            <div key={item.id} className="card">
              <TogetherCard item={item} />
            </div>
          ))}
        </section>
      )}

      <section
        className="card enter grid gap-1.5"
        style={{ '--i': 1 } as CSSProperties}
        aria-label="Horas leyendo a la vez"
      >
        <p className="font-serif text-[50px] leading-none tabular-nums">
          {Math.floor(hours)} <span className="text-[22px]">{Math.floor(hours) === 1 ? 'hora' : 'horas'}</span>
        </p>
        <p className="font-extrabold">leyendo a la vez en {year}</p>
        <p className="text-sm text-muted">
          {hours >= 1
            ? `${Math.round(yearMinutes)} minutos con un libro cada uno y el otro al lado.`
            : 'Cuando uno lea y el otro se una, las horas se irán sumando aquí.'}
        </p>
      </section>

      <section className="card space-y-3" aria-labelledby="racha">
        <div className="flex items-center justify-between gap-3">
          <h2 id="racha">Racha de los dos</h2>
          <Link
            to="/nosotros/racha"
            className="pill min-h-11"
            aria-label={`Ver la racha: ${formatDays(c.streak.current)}`}
          >
            <Lamp size={15} className="text-amber-ink" aria-hidden /> {formatDays(c.streak.current)}
            <ChevronRight size={15} aria-hidden />
          </Link>
        </div>
        <WeekStamps
          today={c.today}
          mine={c.mineDates}
          theirs={c.theirDates}
          profile={profile}
          partner={partner}
          wildcards={c.streak.wildcards}
        />
      </section>

      <section className="space-y-3" aria-labelledby="mes">
        <h2 id="mes">{monthName(month).charAt(0).toUpperCase() + monthName(month).slice(1)}, de momento</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            [monthNights, monthNights === 1 ? 'noche leyendo a la vez' : 'noches leyendo a la vez'],
            [monthPages, 'páginas entre los dos'],
            [monthQuotes, monthQuotes === 1 ? 'cita compartida' : 'citas compartidas'],
          ].map(([value, label]) => (
            <div key={label} className="card grid content-start gap-0.5 p-3">
              <b className="font-serif text-2xl font-normal tabular-nums">{value}</b>
              <span className="text-[12.5px] leading-snug text-muted">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {shelfBooks.length > 0 && (
        <section className="space-y-3" aria-labelledby="estanteria">
          <h2 id="estanteria">Vuestra estantería de {year}</h2>
          <div className="shelf" role="list" aria-label={`Estantería de ${year}`}>
            {shelfBooks.map(({ reading, readers }) => (
              <Spine key={reading.book_id} reading={reading} readers={readers} />
            ))}
          </div>
          <p className="flex flex-wrap gap-x-4 text-[13px] font-bold text-muted">
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--${partner.accent})` }} />
              {partner.display_name}
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--${profile.accent})` }} />
              Tú
            </span>
            <span>
              {readsThisYear} {readsThisYear === 1 ? 'lectura' : 'lecturas'}, {shelfBooks.length}{' '}
              {shelfBooks.length === 1 ? 'libro' : 'libros'}
            </span>
          </p>
        </section>
      )}

      {toRate.length > 0 && (
        <section className="space-y-3" aria-labelledby="ciegas">
          <h2 id="ciegas">Valorad a ciegas</h2>
          {toRate.slice(0, 2).map(({ mine, theirs }) => (
            <article key={mine.id} className="card space-y-3">
              <div className="flex items-center gap-3">
                <Cover book={mine.book} width={44} ribbons={[partner.accent, profile.accent]} />
                <p>
                  <b className="font-extrabold">{mine.book.title}</b>
                  <br />
                  <span className="text-sm text-muted">Lo habéis terminado los dos</span>
                </p>
              </div>
              <BlindRating mine={mine} theirs={theirs} />
            </article>
          ))}
        </section>
      )}

      {loved && (
        <section className="space-y-3" aria-labelledby="querida">
          <h2 id="querida">La cita más querida</h2>
          <QuoteCard quote={loved} compact />
        </section>
      )}

      <section className="card space-y-3" aria-labelledby="reto">
        <div className="flex items-center justify-between gap-3">
          <h2 id="reto">Reto de {monthName(month)}</h2>
          <span className="pill">
            {Math.min(monthNights, NIGHTS_GOAL)} de {NIGHTS_GOAL}
          </span>
        </div>
        <p className="text-sm text-muted">
          Leer a la vez {NIGHTS_GOAL} noches. Vale cualquier noche en la que os juntéis, aunque sea un rato.
        </p>
        <div className="grid grid-cols-10 gap-1.5" role="img" aria-label={`${monthNights} de ${NIGHTS_GOAL} noches`}>
          {Array.from({ length: NIGHTS_GOAL }, (_, i) => (
            <i
              key={i}
              className="h-3 rounded-full"
              style={{
                background:
                  i < monthNights
                    ? `linear-gradient(90deg, var(--${partner.accent}), var(--${profile.accent}))`
                    : 'var(--sunk)',
              }}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="hitos">
        <h2 id="hitos">Hitos</h2>
        <div className="grid grid-cols-3 gap-x-2 gap-y-4">
          {goals.map((goal, index) => {
            const Icon = goal.done ? ICONS[goal.icon] : Lock
            return (
              <div
                key={goal.title}
                className="grid justify-items-center gap-1.5 text-center text-[12.5px] font-extrabold leading-tight"
              >
                <span
                  className={`grid h-[70px] w-[70px] place-items-center rounded-full ${goal.done ? 'text-rose' : 'bg-sunk text-muted'}`}
                  style={
                    goal.done
                      ? {
                          background: 'color-mix(in oklab, var(--rose) 10%, var(--surface))',
                          boxShadow:
                            'inset 0 0 0 1.5px var(--rose), inset 0 0 0 5px color-mix(in oklab, var(--rose) 10%, var(--surface)), inset 0 0 0 6px color-mix(in oklab, var(--rose) 50%, transparent)',
                          rotate: `${[-8, 6, -4, 7, -3, 5][index]}deg`,
                        }
                      : { boxShadow: 'inset 0 0 0 1.5px var(--rule)' }
                  }
                  aria-hidden
                >
                  <Icon size={26} fill={goal.done && goal.icon === 'heart' ? 'currentColor' : 'none'} />
                </span>
                {goal.title}
                <small className="font-bold text-muted">{goal.detail}</small>
              </div>
            )
          })}
        </div>
      </section>

      <button
        type="button"
        className="card flex min-h-[84px] w-full items-center gap-4 text-left"
        onClick={() => setLetterOpen(true)}
      >
        <span
          className="grid h-[50px] w-[72px] flex-none place-items-center rounded-md bg-[color-mix(in_oklab,var(--amber)_30%,var(--surface))] text-rose"
          aria-hidden
        >
          <Mail size={26} />
        </span>
        <span className="grid flex-1 gap-0.5">
          <b className="font-extrabold">Vuestra carta de {monthName(previous)}</b>
          <span className="text-[13.5px] text-muted">Lo que vivisteis leyendo el mes pasado.</span>
        </span>
        <ChevronRight size={20} aria-hidden />
      </button>
      <BottomSheet open={letterOpen} onClose={() => setLetterOpen(false)} title={`Carta de ${monthName(previous)}`}>
        <article
          className="grid gap-3 rounded-md px-5 py-6 font-[family-name:var(--font-book)] text-[16.5px] leading-relaxed"
          style={{
            background:
              'repeating-linear-gradient(transparent 0 31px, color-mix(in oklab, var(--rule) 80%, transparent) 31px 32px), color-mix(in oklab, var(--amber) 7%, var(--surface))',
          }}
        >
          {letter.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
          <p className="hand text-right text-[26px] text-rose">Greenbook</p>
        </article>
      </BottomSheet>

      {together.filter((item) => !pending.includes(item)).length > 0 && (
        <section className="space-y-2" aria-labelledby="juntos">
          <div className="flex items-center justify-between">
            <h2 id="juntos">Queremos leer juntos</h2>
            <Link to="/biblioteca" className="btn btn-link px-1 text-sm">
              Ver en Biblioteca
            </Link>
          </div>
          {together
            .filter((item) => !pending.includes(item))
            .map((item) => (
              <div
                key={item.id}
                className="flex min-h-[72px] items-center gap-3.5 border-t border-rule py-2 first-of-type:border-0"
              >
                <Cover book={item.book} width={44} />
                <p className="min-w-0">
                  <b className="font-serif text-[17px] font-normal">{item.book.title}</b>
                  {item.reason && <span className="block text-[13px] text-muted">{item.reason}</span>}
                </p>
              </div>
            ))}
        </section>
      )}
    </div>
  )
}
