import { useMemo, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { letterFor, letterYears, monthName } from '@/lib/letter'
import { slipPlace } from '@/lib/slips'
import { fmtMinutes } from '@/lib/time'
import { useNow, usePeople } from '@/session'
import { Cover } from '@/ui/Book'
import { Candle } from '@/ui/Candle'
import { Back, Heart } from '@/ui/icons'
import { useBack } from '@/ui/useBack'
import { Wax } from '@/ui/Who'

const count = (n: number, one: string, many: string) => (n === 1 ? one : `${n} ${many}`)

/**
 * «La carta del año»: a year of reading, written back to the two of you as a letter. It is nobody else's:
 * nothing here is meant to be shared, and nothing says who read more.
 */
export function YearLetter() {
  const { year: param } = useParams()
  const year = Number(param)
  const { db, me, partner } = usePeople()
  const back = useBack()
  const now = useNow(60_000)
  const letter = useMemo(() => (Number.isInteger(year) ? letterFor(db, me.id, year) : null), [db, me.id, year])
  const years = useMemo(() => letterYears(db, me.id), [db, me.id])
  if (!letter) return <Navigate to="/estanteria" replace />

  /** Said to both when you are two, to you when you read alone. */
  const say = (both: string, alone: string) => (partner ? both : alone)
  const others = years.filter((y) => y !== year)
  const open = year === new Date(now).getFullYear()

  const paragraph = (children: ReactNode, i: number) => (
    <p className="rise mt-7 text-[21px] leading-[1.45]" style={{ '--i': i } as React.CSSProperties}>
      {children}
    </p>
  )
  const row = (books: typeof letter.books) => (
    <div className="no-scrollbar -mx-5 mt-4 flex gap-3.5 overflow-x-auto px-5 pb-2">
      {books.map((view) => (
        <Link key={view.book.id} to={`/libro/${view.book.id}`} className="pressable flex-none" aria-label={view.book.title}>
          <Cover book={view.book} width={84} />
        </Link>
      ))}
    </div>
  )

  return (
    <main className="mx-auto min-h-dvh max-w-xl px-5 pb-28" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}>
      <button className="icon-btn -ml-2" aria-label="Volver" onClick={back}>
        <Back />
      </button>

      <header className="mt-2 text-center">
        <div className="fade flex items-end justify-center" aria-hidden>
          {partner && <Candle color={partner.color} lit size={58} lean={1} />}
          <Candle color={me.color} lit size={58} lean={partner ? -1 : 0} />
        </div>
        <p className="eyebrow mt-3">{open ? say('Vuestro año, hasta hoy', 'Tu año, hasta hoy') : say('Vuestro año entre páginas', 'Tu año entre páginas')}</p>
        <h1 className="display mt-1 !text-[64px] !leading-none">{year}</h1>
      </header>

      {letter.nights > 0 &&
        paragraph(
          partner && letter.shared > 0 ? (
            <>
              {open ? 'Lleváis' : 'Fueron'} <strong className="font-semibold">{count(letter.shared, 'una noche', 'noches')}</strong> leyendo los dos
              {letter.nights > letter.shared && <>, y {letter.nights} con alguna vela encendida</>}.
            </>
          ) : (
            <>
              {open ? say('Lleváis', 'Llevas') : 'Fueron'} <strong className="font-semibold">{count(letter.nights, 'una noche', 'noches')}</strong> con {say('alguna vela encendida', 'tu vela encendida')}.
            </>
          ),
          1,
        )}
      {letter.minutes > 0 && (
        <p className="quiet mt-2 text-[17px]">
          {[fmtMinutes(letter.minutes) + ' de lectura', letter.place && `casi siempre ${letter.place}`, letter.month != null && `sobre todo en ${monthName(letter.month)}`]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}

      {letter.books.length > 0 && (
        <section aria-label="Los libros del año">
          {paragraph(
            <>
              {say('Cerrasteis', 'Cerraste')} <strong className="font-semibold">{count(letter.books.length, 'un libro', 'libros')}</strong>
              {letter.together.length > 0 && letter.together.length < letter.books.length && <>; {count(letter.together.length, 'uno lo leísteis', 'los leísteis')} los dos</>}
              {letter.together.length > 0 && letter.together.length === letter.books.length && letter.books.length > 1 && <>, todos leídos por los dos</>}.
            </>,
            2,
          )}
          {row(letter.books)}
        </section>
      )}

      {letter.favourites.length > 0 && (
        <section aria-label="Los de cinco estrellas">
          {paragraph(
            letter.favourites.length === 1 ? (
              <>
                Uno se llevó las cinco estrellas: <em>{letter.favourites[0].book.title}</em>.
              </>
            ) : (
              <>{letter.favourites.length} se llevaron las cinco estrellas:</>
            ),
            3,
          )}
          {letter.favourites.length > 1 && (
            <ul className="mt-3 flex flex-col gap-1.5 text-[18px]">
              {letter.favourites.map((view) => (
                <li key={view.book.id} className="flex items-center gap-2.5">
                  <span className="flex flex-none items-center -space-x-1">
                    {view.theirs?.rating === 5 && partner && <Wax who="you" />}
                    {view.mine?.rating === 5 && <Wax who="me" />}
                  </span>
                  <Link to={`/libro/${view.book.id}`} className="min-w-0 truncate italic underline decoration-rule underline-offset-4">
                    {view.book.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {letter.notes > 0 && (
        <section aria-label="Las notas del año">
          {paragraph(
            <>
              {say('Os dejasteis', 'Dejaste')} <strong className="font-semibold">{count(letter.notes, 'una nota', 'notas')}</strong> entre páginas
              {letter.loved.length > 0 ? `. ${letter.loved.length === 1 ? 'Esta llegó' : 'Estas llegaron'}:` : '.'}
            </>,
            4,
          )}
          <ul className="mt-4 flex flex-col gap-3">
            {letter.loved.map((slip) => {
              const own = slip.user_id === me.id
              const book = db.books[slip.book_id]
              return (
                <li key={slip.id} className="note">
                  <span aria-hidden className="absolute inset-y-0 left-0 w-[6px]" style={{ background: own ? 'var(--me)' : 'var(--you)' }} />
                  <p className={`text-[17.5px] leading-[1.45] break-words whitespace-pre-wrap ${slip.kind === 'cita' ? 'italic' : ''}`}>{slip.body}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-[15px] opacity-75">
                    <Heart size={14} filled className="flex-none text-[#b8354f]" />
                    <span className="min-w-0 truncate">
                      {own ? 'Tú' : partner?.name}, en <em>{book?.title}</em>
                      {slipPlace(slip, undefined) && ` · ${slipPlace(slip, undefined)}`}
                    </span>
                  </p>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <p className="quiet mt-12 text-center text-[17px] italic">{open ? 'La carta sigue escribiéndose.' : say('Esto fue lo vuestro. No es de nadie más.', 'Esto fue lo tuyo. No es de nadie más.')}</p>

      {others.length > 0 && (
        <nav aria-label="Otros años" className="mt-8 flex flex-wrap justify-center gap-2">
          {others.map((y) => (
            <Link key={y} to={`/carta/${y}`} replace className="chip">
              {y}
            </Link>
          ))}
        </nav>
      )}
    </main>
  )
}
