import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  dropReading, editBook, markNext, editSession, finishReading, leaveSlip, lightCandle, openBook, placeBookmark, rateReading, removeBook,
  removeBookmark, removeSession, resizeReading, restoreSession, saveEvening, shelveForLater,
} from '@/lib/actions'
import { bookViews, byNewest, fmtPosition, fmtProgress, isLit, live, isNext, progressOf, tally } from '@/lib/model'
import { fmtDay, fmtMinutes } from '@/lib/time'
import type { Book, Profile, Reading, Session, Unit } from '@/lib/types'
import { usePeople, useNow } from '@/session'
import { Cover } from '@/ui/Book'
import { Back, Close, Flame, More } from '@/ui/icons'
import { NumberDial } from '@/ui/NumberDial'
import { PlacementForm } from '@/ui/Placement'
import { Sheet } from '@/ui/Sheet'
import { MinutesField } from '@/ui/Minutes'
import { Stars } from '@/ui/Stars'
import { toast } from '@/ui/toast'
import { PersonRow, Wax } from '@/ui/Who'
import { BookSlips } from './BookSlips'

type Open = null | 'log' | 'finish' | 'more' | 'place' | 'edit' | 'size' | 'remove'

/** A book pulled off the shelf: where each of you is in it, and everything it has gathered. */
export function BookPage() {
  const { bookId } = useParams()
  const [params, setParams] = useSearchParams()
  const { db, me, partner } = usePeople()
  const now = useNow()
  const navigate = useNavigate()
  const [open, setOpen] = useState<Open>(params.has('cerrar') ? 'finish' : params.has('unirme') ? 'place' : null)
  const [fixing, setFixing] = useState<Session | null>(null)
  const [showAll, setShowAll] = useState(false)
  const { hash } = useLocation()

  // Arriving from «te espera» in the room: go straight to the slips or the envelope.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash])

  const view = useMemo(() => bookViews(db, me.id).find((v) => v.book.id === bookId), [db, me.id, bookId])
  const sessions = useMemo(
    () => live(db.sessions).filter((s) => s.reading_id === view?.mine?.id || s.reading_id === view?.theirs?.id),
    [db.sessions, view?.mine?.id, view?.theirs?.id],
  )
  if (!view) return <Navigate to="/" replace />
  const { book, mine, theirs } = view
  const close = () => {
    setOpen(null)
    if (params.has('cerrar') || params.has('unirme')) setParams({}, { replace: true })
  }
  const candleHere = isLit(me, now) && me.candle_reading_id === mine?.id
  const evenings = byNewest(sessions)
  const total = tally(sessions)
  const shared = sessions.some((s) => s.user_id === me.id) && sessions.some((s) => s.user_id !== me.id)

  const light = () => {
    if (!mine) return
    navigator.vibrate?.(18)
    lightCandle(mine)
    navigate('/velada')
  }

  return (
    <main className="fade mx-auto min-h-dvh max-w-xl px-5 pb-32" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}>
      <div className="flex items-center justify-between">
        <button className="icon-btn -ml-2" aria-label="Volver a la habitación" onClick={() => navigate(-1)}>
          <Back />
        </button>
        <button className="icon-btn -mr-2" aria-label="Más opciones" onClick={() => setOpen('more')}>
          <More />
        </button>
      </div>

      <header className="mt-3 flex gap-5">
        <Cover book={book} width={104} />
        <div className="min-w-0 flex-1 self-end">
          <h1 className="text-[28px] leading-[1.08]">{book.title}</h1>
          {book.author && <p className="quiet mt-1.5 text-[18px] italic">{book.author}</p>}
        </div>
      </header>

      {/* Where each of you is */}
      <section className="mt-7" aria-label="Marcapáginas">
        <div className="flex flex-col gap-3">
          {mine && <PersonRow who="me" name="Tú" text={whereText(mine, true)} at={present(mine) && progressOf(mine)} />}
          {theirs && partner && (
            <PersonRow who="you" name={partner.name} text={whereText(theirs, false)} at={present(theirs) && progressOf(theirs)} />
          )}
        </div>
      </section>

      {/* What you can do with it now */}
      <section className="mt-7 flex flex-col gap-2">
        {mine?.status === 'leyendo' && (
          <>
            <button className="btn btn-primary" onClick={candleHere ? () => navigate('/velada') : light}>
              <Flame size={20} /> {candleHere ? 'Volver a la velada' : 'Encender la vela con este'}
            </button>
            <button className="btn btn-soft" onClick={() => setOpen('log')}>
              Apuntar por dónde voy
            </button>
            <button className="btn btn-text self-center" onClick={() => setOpen('finish')}>
              Lo he terminado
            </button>
          </>
        )}
        {mine?.status === 'pendiente' && (
          <button className="btn btn-primary" onClick={() => openBook(mine)}>
            Empezar a leerlo
          </button>
        )}
        {mine?.status === 'dejado' && (
          <button className="btn btn-primary" onClick={() => openBook(mine)}>
            Retomarlo
          </button>
        )}
        {mine?.status === 'terminado' && (
          <div>
            <p className="label">¿Cuánto te gustó?</p>
            <Stars value={mine.rating} onChange={(rating) => rateReading(mine, rating)} />
          </div>
        )}
        {!mine && (
          <button className="btn btn-primary" onClick={() => setOpen('place')}>
            {theirs ? 'Yo también quiero leerlo' : 'Ponerle mi marcapáginas'}
          </button>
        )}
      </section>

      <BookSlips view={view} />

      {/* Evenings */}
      {evenings.length > 0 && (
        <section className="mt-12" aria-labelledby="veladas">
          <h2 id="veladas" className="eyebrow mb-3">
            Veladas
          </h2>
          <p className="quiet text-[16.5px]">
            {[
              `${total.nights === 1 ? 'Una noche' : `${total.nights} noches`}${shared ? ' entre los dos' : ''}`,
              total.minutes > 0 && fmtMinutes(total.minutes),
              total.place && `sobre todo ${total.place}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <ul className="mt-4 border-t border-rule">
            {(showAll ? evenings : evenings.slice(0, 5)).map((session) => {
              const own = session.user_id === me.id
              return (
                <Evening
                  key={session.id}
                  session={session}
                  own={own}
                  name={own ? 'Tú' : (partner?.name ?? '')}
                  unit={(own ? mine : theirs)?.unit ?? 'paginas'}
                  onFix={() => setFixing(session)}
                />
              )
            })}
          </ul>
          {evenings.length > 5 && !showAll && (
            <button className="btn btn-text -ml-2" onClick={() => setShowAll(true)}>
              Ver las {evenings.length}
            </button>
          )}
        </section>
      )}

      <Sheet open={!!fixing} onClose={() => setFixing(null)} title="Corregir la velada">
        {fixing && mine && <FixEvening session={fixing} reading={mine} onDone={() => setFixing(null)} />}
      </Sheet>

      <Sheet open={open === 'log'} onClose={close} title="¿Por dónde vas?">
        {open === 'log' && mine && (
          <Log
            reading={mine}
            onDone={(finished) => (finished ? setOpen('finish') : close())}
          />
        )}
      </Sheet>

      <Sheet open={open === 'finish'} onClose={close} title="Cerrar el libro">
        {open === 'finish' && mine && (
          <Finish
            reading={mine}
            book={book}
            theirs={theirs}
            partner={partner}
            onDone={() => {
              close()
              toast('Ya está en la estantería')
            }}
          />
        )}
      </Sheet>

      <Sheet open={open === 'place'} onClose={close} title={book.title}>
        {open === 'place' && (
          <PlacementForm
            pages={book.pages}
            action="Poner mi marcapáginas"
            onDone={(placement) => {
              placeBookmark(book, placement)
              close()
            }}
          />
        )}
      </Sheet>

      <Sheet open={open === 'more'} onClose={close} label="Más opciones">
        <div className="flex flex-col">
          <Option onClick={() => setOpen('edit')}>Corregir título, autor o páginas</Option>
          {mine && mine.status !== 'terminado' && <Option onClick={() => setOpen('size')}>Cambiar cómo lo cuento (páginas o %)</Option>}
          {mine?.status === 'leyendo' && (
            <>
              <Option onClick={() => { shelveForLater(mine); close() }}>Dejarlo para más adelante</Option>
              <Option onClick={() => { dropReading(mine); close(); toast('Dejado a medias. No pasa nada.') }}>Dejarlo a medias</Option>
            </>
          )}
          {mine?.status === 'pendiente' &&
            (isNext(mine) ? (
              <Option onClick={() => { markNext(mine, false); close() }}>Ya no es el siguiente</Option>
            ) : (
              <Option onClick={() => { markNext(mine, true); close(); toast('Será el siguiente. Va el primero de la pila.') }}>
                Que sea el siguiente que lea
              </Option>
            ))}
          {mine?.status === 'terminado' && <Option onClick={() => { openBook(mine); close() }}>Volver a leerlo</Option>}
          <Option danger onClick={() => setOpen('remove')}>Quitarlo de mi lado…</Option>
        </div>
      </Sheet>

      <Sheet open={open === 'remove'} onClose={close} title="¿Qué quitamos?">
        <div className="flex flex-col gap-3">
          {mine && (
            <button
              className="btn btn-line"
              onClick={() => {
                removeBookmark(mine)
                close()
                if (!theirs) navigate('/', { replace: true })
              }}
            >
              Solo mi marcapáginas
            </button>
          )}
          <button
            className="btn btn-line btn-danger"
            onClick={() => {
              removeBook(book)
              navigate('/', { replace: true })
            }}
          >
            El libro entero de la estantería
          </button>
          <p className="quiet text-[15px]">
            {theirs && partner
              ? `Quitar el libro entero también lo quita para ${partner.name}.`
              : 'Tus veladas con este libro dejarán de verse.'}
          </p>
        </div>
      </Sheet>

      <Sheet open={open === 'edit'} onClose={close} title="Corregir el libro">
        {open === 'edit' && <Edit book={book} onDone={close} />}
      </Sheet>

      <Sheet open={open === 'size'} onClose={close} title="¿Cómo lo cuentas?">
        {open === 'size' && mine && <Size reading={mine} onDone={close} />}
      </Sheet>
    </main>
  )
}

/** A bookmark only shows on the line once the book has been opened. */
const present = (reading?: Reading) => (reading && reading.status !== 'pendiente' ? reading : undefined)

/** «vas por la página 142 de 600», «lo terminó el 3 de mayo». */
function whereText(reading: Reading, second: boolean): string {
  if (reading.status === 'terminado') {
    return `${second ? 'lo terminaste' : 'lo terminó'}${reading.finished_on ? ` el ${fmtDay(reading.finished_on)}` : ''}`
  }
  if (reading.status === 'pendiente') return `${second ? 'lo tienes' : 'lo tiene'} por leer`
  if (reading.status === 'dejado') return `${second ? 'lo dejaste' : 'lo dejó'} en la ${fmtPosition(reading)}`
  return `${second ? 'vas' : 'va'} por la ${fmtProgress(reading)}`
}

interface EveningProps {
  session: Session
  /** It is mine: I can correct it or take it away. */
  own: boolean
  name: string
  unit: Unit
  onFix: () => void
}

function Evening({ session, own, name, unit, onFix }: EveningProps) {
  const read = session.to_pos - session.from_pos
  const range = unit === 'porcentaje' ? `hasta el ${session.to_pos} %` : read > 0 ? `p. ${session.from_pos}–${session.to_pos}` : `p. ${session.to_pos}`
  const detail = [range, session.minutes && fmtMinutes(session.minutes), session.place].filter(Boolean).join(' · ')
  const text = (
    <>
      <span className="flex items-center gap-2 text-[16.5px]">
        <Wax who={own ? 'me' : 'you'} />
        <span>
          <span className="font-medium">{name}</span> <span className="quiet">· {fmtDay(session.day)}</span>
        </span>
      </span>
      <span className="quiet block truncate pl-[19px] text-[15px]">{detail}</span>
    </>
  )
  return (
    <li className="flex items-center gap-1 border-b border-rule">
      {own ? (
        <button type="button" className="pressable min-w-0 flex-1 py-2 text-left" aria-label={`Corregir tu velada del ${fmtDay(session.day)}: ${detail}`} onClick={onFix}>
          {text}
        </button>
      ) : (
        <div className="min-w-0 flex-1 py-2">{text}</div>
      )}
      {own && (
        <>
          <button className="quiet min-h-11 px-2 text-[15px] underline decoration-rule underline-offset-4" aria-hidden tabIndex={-1} onClick={onFix}>
            Corregir
          </button>
          <button
            className="icon-btn quiet"
            aria-label={`Quitar la velada del ${fmtDay(session.day)}`}
            onClick={() => {
              removeSession(session)
              toast('Velada quitada', { label: 'Deshacer', run: () => restoreSession(session) })
            }}
          >
            <Close size={18} />
          </button>
        </>
      )}
    </li>
  )
}

/** A saved evening, corrected: the page, the minutes and the place. */
function FixEvening({ session, reading, onDone }: { session: Session; reading: Reading; onDone: () => void }) {
  const [position, setPosition] = useState(session.to_pos)
  const [minutes, setMinutes] = useState(session.minutes ?? 0)
  const [place, setPlace] = useState(session.place ?? '')
  const percent = reading.unit === 'porcentaje'
  return (
    <div className="flex flex-col gap-6 pt-2">
      <p className="quiet -mt-2">{fmtDay(session.day)}</p>
      <NumberDial
        value={position}
        onChange={setPosition}
        max={reading.total}
        label={percent ? 'Porcentaje al que llegaste' : 'Página a la que llegaste'}
        suffix={percent ? '% del libro' : `de ${reading.total} páginas`}
      />
      <div className="flex items-start justify-between gap-3">
        <span className="quiet pt-2.5">Leíste</span>
        <MinutesField value={minutes} onChange={setMinutes} min={0} />
      </div>
      <div>
        <label className="label" htmlFor="fix-place">
          ¿Dónde? <span className="text-[15px]">(si quieres)</span>
        </label>
        <input id="fix-place" className="field" maxLength={40} placeholder="en la cama, en el tren…" value={place} onChange={(event) => setPlace(event.currentTarget.value)} />
      </div>
      <button
        className="btn btn-primary"
        onClick={() => {
          editSession(session, { position, minutes: minutes || null, place: place || null })
          onDone()
          toast('Velada corregida')
        }}
      >
        Guardar
      </button>
    </div>
  )
}

function Option({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      className={`flex min-h-[54px] items-center border-b border-rule text-left text-[18px] last:border-0 ${danger ? 'text-danger' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

/** Moving the bookmark without the candle: for when you read away from the phone. */
function Log({ reading, onDone }: { reading: Reading; onDone: (finished: boolean) => void }) {
  const [position, setPosition] = useState(reading.position)
  const [minutes, setMinutes] = useState('')
  const percent = reading.unit === 'porcentaje'
  return (
    <div className="flex flex-col gap-6 pt-2">
      <NumberDial
        value={position}
        onChange={setPosition}
        max={reading.total}
        label={percent ? 'Porcentaje del libro' : 'Página'}
        suffix={percent ? '% del libro' : `de ${reading.total} páginas`}
      />
      <div>
        <label className="label" htmlFor="log-minutes">
          ¿Cuánto rato, más o menos? <span className="text-[15px]">(minutos, si quieres)</span>
        </label>
        <input
          id="log-minutes"
          className="field"
          inputMode="numeric"
          value={minutes}
          onChange={(event) => setMinutes(event.currentTarget.value.replace(/\D/g, '').slice(0, 3))}
        />
      </div>
      <button
        className="btn btn-primary"
        disabled={position === reading.position && !minutes}
        onClick={() => {
          saveEvening({ reading, position, minutes: minutes ? Number(minutes) : null, place: null, startedAt: null })
          onDone(position >= reading.total)
        }}
      >
        {position >= reading.total ? 'Lo he terminado' : 'Guardar'}
      </button>
    </div>
  )
}

interface FinishProps {
  reading: Reading
  book: Book
  theirs?: Reading
  partner: Profile | null
  onDone: () => void
}

/** The last page: the book goes to the shelf, and with it, if you want, a final note of what it was for you. */
function Finish({ reading, book, theirs, partner, onDone }: FinishProps) {
  const { db, me } = usePeople()
  const [rating, setRating] = useState<number | null>(reading.rating)
  const [letter, setLetter] = useState('')
  const hasLetter = Object.values(db.slips).some(
    (s) => s.book_id === book.id && s.user_id === me.id && s.kind === 'carta' && !s.deleted_at,
  )
  const theirOpen = theirs?.status === 'leyendo' || theirs?.status === 'pendiente'
  return (
    <div className="flex flex-col gap-6">
      <p className="quiet">La última página. El libro pasa a la estantería con tu cinta.</p>
      <div>
        <p className="label">¿Cuánto te ha gustado? <span className="text-[15px]">(si quieres)</span></p>
        <Stars value={rating} onChange={setRating} />
      </div>
      {!hasLetter && (
        <div>
          <p className="label">
            Tu nota final <span className="text-[15px]">(si quieres)</span>
          </p>
          <div className="slip">
            <textarea
              className="hand block min-h-[112px] w-full resize-none bg-transparent leading-[28px] outline-none placeholder:opacity-45"
              maxLength={4000}
              placeholder="Lo que ha sido este libro para ti, cómo te has sentido leyéndolo…"
              aria-label="Tu nota final"
              value={letter}
              onChange={(event) => setLetter(event.currentTarget.value)}
            />
          </div>
          <p className="quiet mt-2 text-[15px]">
            {!partner ? 'Se queda guardada con el libro, para cuando vuelvas a él.' : null}
            {partner && <>Se queda guardada con el libro, para cuando volváis a él.{' '}
            {theirOpen
              ? `${partner.name} la leerá cuando lo termine y haya escrito la suya.`
              : theirs?.status === 'terminado'
                ? `${partner.name} la leerá cuando haya escrito la suya. Y tú, la suya.`
                : `${partner.name} podrá leerla.`}</>}
          </p>
        </div>
      )}
      <button
        className="btn btn-primary"
        onClick={() => {
          finishReading(reading, rating)
          if (letter.trim()) leaveSlip({ book, kind: 'carta', page: null, body: letter })
          onDone()
        }}
      >
        Llevarlo a la estantería
      </button>
    </div>
  )
}

function Edit({ book, onDone }: { book: Book; onDone: () => void }) {
  const [title, setTitle] = useState(book.title)
  const [author, setAuthor] = useState(book.author)
  const [pages, setPages] = useState(book.pages ? String(book.pages) : '')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    editBook(book, { title: title.trim(), author: author.trim(), pages: Number(pages) > 0 ? Number(pages) : null })
    onDone()
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="label" htmlFor="edit-title">Título</label>
        <input id="edit-title" className="field" required maxLength={300} value={title} onChange={(e) => setTitle(e.currentTarget.value)} />
      </div>
      <div>
        <label className="label" htmlFor="edit-author">Quién lo escribió</label>
        <input id="edit-author" className="field" maxLength={300} value={author} onChange={(e) => setAuthor(e.currentTarget.value)} />
      </div>
      <div>
        <label className="label" htmlFor="edit-pages">Páginas</label>
        <input id="edit-pages" className="field" inputMode="numeric" value={pages} onChange={(e) => setPages(e.currentTarget.value.replace(/\D/g, '').slice(0, 5))} />
      </div>
      <button className="btn btn-primary mt-2" disabled={!title.trim()}>Guardar</button>
    </form>
  )
}

function Size({ reading, onDone }: { reading: Reading; onDone: () => void }) {
  const [unit, setUnit] = useState<Unit>(reading.unit)
  const [total, setTotal] = useState(reading.unit === 'paginas' ? String(reading.total) : '')
  const count = Number(total)
  const valid = unit === 'porcentaje' || (Number.isInteger(count) && count > 0 && count <= 20000)
  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        <button type="button" className="chip" aria-pressed={unit === 'paginas'} onClick={() => setUnit('paginas')}>En papel, por páginas</button>
        <button type="button" className="chip" aria-pressed={unit === 'porcentaje'} onClick={() => setUnit('porcentaje')}>En Kindle, por %</button>
      </div>
      {unit === 'paginas' && (
        <div>
          <label className="label" htmlFor="size-total">Páginas de tu edición</label>
          <input id="size-total" className="field" inputMode="numeric" value={total} onChange={(e) => setTotal(e.currentTarget.value.replace(/\D/g, '').slice(0, 5))} />
        </div>
      )}
      <p className="quiet text-[15px]">Tu marcapáginas se queda en el mismo punto del libro.</p>
      <button
        className="btn btn-primary"
        disabled={!valid}
        onClick={() => {
          resizeReading(reading, unit, unit === 'porcentaje' ? 100 : count)
          onDone()
        }}
      >
        Guardar
      </button>
    </div>
  )
}
