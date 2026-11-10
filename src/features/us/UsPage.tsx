import { useState } from 'react'
import { Link } from 'react-router'
import { Dices, Lamp, Mail, ScrollText } from 'lucide-react'
import { BottomSheet } from '@/components/BottomSheet'
import { Cover } from '@/components/Cover'
import { FilterChips } from '@/components/FilterChips'
import { Spine } from '@/components/Spine'
import { useMe } from '@/features/auth/me'
import { QuoteCard } from '@/features/quotes/QuoteCard'
import { useOpinions, usePartnerOpinionBooks, useTogether } from '@/lib/data'
import { fmt } from '@/lib/dates'
import { pagesEquivalent } from '@/lib/stats/aggregate'
import type { Accent, ReadingWithBook } from '@/lib/types'
import { formatDays } from '@/lib/units'
import { BlindPair } from './BlindPair'
import { YearInBooks } from './YearInBooks'
import { summaryYear, yearSummary } from './yearSummary'
import { TogetherCard } from './TogetherCard'
import { monthLetter, monthName, talkedQuote } from './together-stats'
import { useCouple } from './useCouple'

/** Nosotros: not statistics, what you share. Hours side by side, your shelf, your streak, your favourite words. */
export function UsPage() {
  const { userId, profile, partner } = useMe()
  const c = useCouple()
  const together = useTogether(!!partner).data ?? []
  const opinions = useOpinions(!!partner).data ?? []
  const partnerOpinionBooks = usePartnerOpinionBooks(!!partner).data ?? []
  const [letterOpen, setLetterOpen] = useState(false)
  const [shelfYear, setShelfYear] = useState<string | null>(null)
  const [drawn, setDrawn] = useState<string | null>(null)
  if (!partner)
    return (
      <section className="space-y-4">
        <h1 className="display">Nosotros</h1>
        <p>Vuestro rincón estará aquí al vincular las dos cuentas.</p>
      </section>
    )
  const thisYear = c.today.slice(0, 4)
  const shelfYears = [
    ...new Set(
      [...c.mineReadings, ...c.theirReadings].flatMap((r) => (r.status === 'finished' && r.finished_on ? [r.finished_on.slice(0, 4)] : [])),
    ),
  ].sort((a, b) => b.localeCompare(a))
  const year = shelfYear && shelfYears.includes(shelfYear) ? shelfYear : shelfYears.includes(thisYear) ? thisYear : (shelfYears[0] ?? thisYear)
  const month = c.today.slice(0, 7)
  const previous = (() => {
    const d = new Date(Number(thisYear), Number(month.slice(5, 7)) - 2, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()
  const monthNights = c.rows.filter((r) => r.started_at.startsWith(month) && c.minutes.has(r.id)).length
  const monthPages = c.sessions
    .filter((s) => s.read_on.startsWith(month))
    .reduce((sum, s) => {
      const reading =
        c.mineReadings.find((r) => r.id === s.reading_id) ?? c.theirReadings.find((r) => r.id === s.reading_id)
      return sum + (reading ? pagesEquivalent(s, reading) : 0)
    }, 0)
  const monthQuotes = c.quotes.filter((q) => q.created_at.startsWith(month) && q.shared).length
  const monthBothDays = [...c.mineDates].filter((date) => date.startsWith(month) && c.theirDates.has(date)).length
  // Only what happened: a zero takes a whole tile and says nothing.
  const monthStats = (
    [
      [monthBothDays, monthBothDays === 1 ? 'día leyendo los dos' : 'días leyendo los dos'],
      [monthPages, 'páginas entre los dos'],
      [monthQuotes, monthQuotes === 1 ? 'cita compartida' : 'citas compartidas'],
      [monthNights, monthNights === 1 ? 'noche leyendo a la vez' : 'noches leyendo a la vez'],
    ] as const
  ).filter(([value]) => value > 0)
  const talked = talkedQuote(c.quotes, c.reactions, c.replies)
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
  // Books you both finished that still have something blind to do (a mark or a sentence), or whose sentences were
  // revealed in the last two weeks; newest first.
  const opinionOf = (user: string, bookId: string) => opinions.find((o) => o.user_id === user && o.book_id === bookId)
  const lastFinish = ({ mine, theirs }: { mine: ReadingWithBook; theirs: ReadingWithBook }) =>
    [mine.finished_on ?? '', theirs.finished_on ?? ''].sort().at(-1) ?? ''
  const blind = bothFinished
    .filter(({ mine, theirs }) => {
      const myOpinion = opinionOf(userId, mine.book_id)
      const theirOpinion = opinionOf(partner.id, mine.book_id)
      const revealedAt = myOpinion && theirOpinion ? Math.max(Date.parse(myOpinion.updated_at), Date.parse(theirOpinion.updated_at)) : 0
      return (
        mine.rating === null ||
        theirs.rating === null ||
        !myOpinion ||
        !(theirOpinion || partnerOpinionBooks.includes(mine.book_id)) ||
        Date.parse(c.today) - revealedAt < 14 * 24 * 60 * 60 * 1000
      )
    })
    .sort((a, b) => lastFinish(b).localeCompare(lastFinish(a)))
  const pending = together.filter(
    (item) => (!item.partner_answer && item.partner_id === userId) || (item.partner_answer === 'yes' && !item.start_on),
  )
  const waiting = together.filter((item) => !pending.includes(item) && !item.start_on)
  const firstDate = [...c.rows.map((r) => r.started_at.slice(0, 10)), ...c.sessions.map((s) => s.read_on)].sort()[0]
  const [first, second] = partner.is_gift_recipient ? [partner, profile] : [profile, partner]
  const summaryFor = summaryYear(c.today)
  const summary = yearSummary({
    year: summaryFor,
    today: c.today,
    me: profile,
    partner,
    readings: [...c.mineReadings, ...c.theirReadings],
    sessions: c.sessions,
    rows: c.rows,
    minutes: c.minutes,
    quotes: c.quotes,
    reactions: c.reactions,
    replies: c.replies,
  })
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
      <header className="card enter relative flex items-center gap-4 px-5 py-4">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-1.5 rounded-[18px] border-[1.5px] border-[color-mix(in_oklab,var(--plum)_30%,transparent)]"
        />
        <p className="font-serif text-[30px] leading-none whitespace-nowrap" aria-hidden>
          <span style={{ color: `var(--${first.accent})` }}>{first.display_name.charAt(0)}</span>
          <span className="font-[family-name:var(--font-book)] text-rose italic">&amp;</span>
          <span style={{ color: `var(--${second.accent})` }}>{second.display_name.charAt(0)}</span>
        </p>
        <div className="min-w-0 flex-1">
          <h1 className="text-[18px] leading-tight [overflow-wrap:anywhere]">
            {first.display_name} y {second.display_name}
          </h1>
          {firstDate && <p className="text-[13px] text-muted">Desde {fmt(firstDate, "MMMM 'de' yyyy")}</p>}
        </div>
        {/* The streak's week lives in Inicio; here, a way into its calendar. */}
        <Link
          to="/nosotros/racha"
          className="pill relative min-h-11 flex-none"
          aria-label={`Racha de los dos: ${formatDays(c.streak.current)}. Ver el calendario`}
        >
          <Lamp size={15} className="text-amber-ink" aria-hidden /> {formatDays(c.streak.current)}
        </Link>
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

      {monthStats.length > 0 && (
        <section className="space-y-3" aria-labelledby="mes">
          <h2 id="mes">{monthName(month).charAt(0).toUpperCase() + monthName(month).slice(1)}, de momento</h2>
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${monthStats.length === 4 ? 2 : monthStats.length}, minmax(0, 1fr))`,
            }}
          >
            {monthStats.map(([value, label]) => (
              <div key={label} className="card grid content-start gap-0.5 p-3">
                <b className="font-serif text-2xl font-normal tabular-nums">{value}</b>
                <span className="text-[12.5px] leading-snug text-muted">{label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <nav className="enter grid grid-cols-3 gap-2" aria-label="Vuestra historia">
        <Link to="/nosotros/diario" className="card pressable grid min-h-[104px] content-start justify-items-start gap-1.5 p-3.5">
          <ScrollText size={22} className="text-plum" aria-hidden />
          <b className="text-[14.5px] leading-tight font-extrabold">Vuestro diario</b>
          <span className="text-xs leading-snug text-muted">Mes a mes, todo lo leído</span>
        </Link>
        {(summary.books > 0 || summary.bothDays > 0) && (
          <YearInBooks summary={summary} names={`${first.display_name} y ${second.display_name}`} />
        )}
        <button
          type="button"
          className="card pressable grid min-h-[104px] content-start justify-items-start gap-1.5 p-3.5 text-left"
          onClick={() => setLetterOpen(true)}
        >
          <Mail size={22} className="text-amber-ink" aria-hidden />
          <b className="text-[14.5px] leading-tight font-extrabold">Carta de {monthName(previous)}</b>
          <span className="text-xs leading-snug text-muted">Lo que vivisteis leyendo</span>
        </button>
      </nav>

      {shelfBooks.length > 0 && (
        <section className="space-y-3" aria-labelledby="estanteria">
          <h2 id="estanteria">Vuestra estantería de {year}</h2>
          {shelfYears.length > 1 && (
            <FilterChips bleed options={shelfYears.map((value) => ({ value, label: value }))} value={year} onChange={setShelfYear} aria-label="Año de la estantería" />
          )}
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

      {blind.length > 0 && (
        <section className="space-y-3" aria-labelledby="ciegas">
          <h2 id="ciegas">A ciegas</h2>
          {blind.slice(0, 2).map(({ mine, theirs }) => (
            <article key={mine.id} className="card space-y-3">
              <div className="flex items-center gap-3">
                <Cover book={mine.book} width={44} ribbons={[partner.accent, profile.accent]} />
                <p>
                  <b className="font-extrabold">{mine.book.title}</b>
                  <br />
                  <span className="text-sm text-muted">Lo habéis terminado los dos</span>
                </p>
              </div>
              <BlindPair mine={mine} theirs={theirs} />
            </article>
          ))}
        </section>
      )}

      {talked && (
        <section className="space-y-3" aria-labelledby="hablar">
          <h2 id="hablar">La que más dio que hablar</h2>
          <QuoteCard quote={talked} compact />
        </section>
      )}

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
          <div className="flex items-center justify-between gap-3">
            <h2 id="juntos">Queremos leer juntos</h2>
            {waiting.length > 1 && (
              <button
                type="button"
                className="btn btn-link px-1 text-sm"
                onClick={() => {
                  const pool = waiting.filter((item) => item.id !== drawn)
                  setDrawn(pool[Math.floor(Math.random() * pool.length)].id)
                }}
              >
                <Dices size={16} aria-hidden /> {drawn ? 'Otro' : 'A suertes'}
              </button>
            )}
          </div>
          <p className="sr-only" aria-live="polite">
            {drawn ? `Ha salido «${waiting.find((item) => item.id === drawn)?.book.title ?? ''}»` : ''}
          </p>
          {together
            .filter((item) => !pending.includes(item))
            .map((item) => (
              <div
                key={item.id}
                className={`flex min-h-[72px] items-center gap-3.5 border-t border-rule py-2 first-of-type:border-0 ${item.id === drawn ? '-mx-3 rounded-[18px] border-transparent bg-[color-mix(in_oklab,var(--amber)_16%,var(--surface))] px-3' : ''}`}
                style={item.id === drawn ? { animation: 'gb-pop-in 360ms var(--ease) both' } : undefined}
              >
                <Cover book={item.book} width={44} />
                <p className="min-w-0">
                  <b className="font-serif text-[17px] font-normal">{item.book.title}</b>
                  {item.reason && <span className="block text-[13px] text-muted">{item.reason}</span>}
                  {item.id === drawn && <span className="block text-[13px] font-extrabold text-amber-ink">¡Este! ¿Lo empezáis?</span>}
                </p>
              </div>
            ))}
        </section>
      )}
    </div>
  )
}
