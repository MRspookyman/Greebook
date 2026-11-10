import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  dropReading, editBook, finishReading, leaveVerdict, lightCandle, openBook, placeBookmark, removeBook,
  removeBookmark, removeSession, resizeReading, restoreSession, saveEvening, shelveForLater,
} from '@/lib/actions'
import { searchBooks } from '@/lib/books/search'
import { bookViews, fmtPosition, fmtProgress, isLit, live, tally } from '@/lib/model'
import { fmtDay, fmtMinutes } from '@/lib/time'
import type { Book, Profile, Reading, Session, Unit } from '@/lib/types'
import { shrinkCover } from '@/lib/cover'
import { usePeople, useNow, useSession } from '@/session'
import { Cover } from '@/ui/Book'
import { Back, Close, Flame, More } from '@/ui/icons'
import { NumberDial } from '@/ui/NumberDial'
import { PlacementForm } from '@/ui/Placement'
import { Rail } from '@/ui/Rail'
import { Sheet } from '@/ui/Sheet'
import { Stars } from '@/ui/Stars'
import { toast } from '@/ui/toast'
import { BookSlips } from './BookSlips'

type Open = null | 'log' | 'finish' | 'more' | 'place' | 'edit' | 'size' | 'remove'

/** A book pulled off the shelf: where each of you is in it, and everything it has gathered. */
export function BookPage() {
  const { bookId } = useParams()
  const [params, setParams] = useSearchParams()
  const { db, me, partner } = usePeople()
  const now = useNow()
  const navigate = useNavigate()
  const [open, setOpen] = useState<Open>(params.has('cerrar') ? 'finish' : null)
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
    if (params.has('cerrar')) setParams({}, { replace: true })
  }
  const candleHere = isLit(me, now) && me.candle_reading_id === mine?.id
  const mySessions = sessions.filter((s) => s.user_id === me.id).sort((a, b) => (b.started_at ?? b.created_at).localeCompare(a.started_at ?? a.created_at))
  const theirSessions = sessions.filter((s) => s.user_id !== me.id)

  const light = () => {
    if (!mine) return
    navigator.vibrate?.(18)
    lightCandle(mine)
    navigate('/velada')
  }

  return (
    <main className="fade mx-auto min-h-dvh max-w-xl px-5 pb-24" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}>
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
        <Rail mine={present(mine)} theirs={present(theirs)} />
        <ul className="mt-2 flex flex-col gap-1 text-[16.5px]">
          {mine && <Where who="Tú" second color="var(--me)" reading={mine} />}
          {theirs && partner && <Where who={partner.name} color="var(--you)" reading={theirs} />}
        </ul>
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
        {!mine && (
          <button className="btn btn-primary" onClick={() => setOpen('place')}>
            {theirs ? 'Yo también quiero leerlo' : 'Ponerle mi marcapáginas'}
          </button>
        )}
      </section>

      <BookSlips view={view} />

      {/* Evenings */}
      {(mySessions.length > 0 || theirSessions.length > 0) && (
        <section className="mt-12" aria-labelledby="veladas">
          <h2 id="veladas" className="eyebrow mb-3">
            Veladas
          </h2>
          <div className="flex flex-col gap-1 text-[17px]">
            {mySessions.length > 0 && <Tally who="Tú" sessions={mySessions} />}
            {theirSessions.length > 0 && partner && <Tally who={partner.name} sessions={theirSessions} />}
          </div>
          {mySessions.length > 0 && (
            <ul className="mt-4 border-t border-rule">
              {(showAll ? mySessions : mySessions.slice(0, 4)).map((session) => (
                <Evening key={session.id} session={session} unit={mine?.unit ?? 'paginas'} />
              ))}
            </ul>
          )}
          {mySessions.length > 4 && !showAll && (
            <button className="btn btn-text -ml-2" onClick={() => setShowAll(true)}>
              Ver las {mySessions.length}
            </button>
          )}
        </section>
      )}

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
          <Option onClick={() => setOpen('edit')}>Cambiar portada, título, autor o páginas</Option>
          {mine && mine.status !== 'terminado' && <Option onClick={() => setOpen('size')}>Cambiar cómo lo cuento (páginas o %)</Option>}
          {mine?.status === 'leyendo' && (
            <>
              <Option onClick={() => { shelveForLater(mine); close() }}>Dejarlo para más adelante</Option>
              <Option onClick={() => { dropReading(mine); close(); toast('Dejado a medias. No pasa nada.') }}>Dejarlo a medias</Option>
            </>
          )}
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

function Where({ who, color, reading, second }: { who: string; color: string; reading: Reading; second?: boolean }) {
  const text =
    reading.status === 'terminado'
      ? `${second ? 'lo terminaste' : 'lo terminó'}${reading.finished_on ? ` el ${fmtDay(reading.finished_on)}` : ''}`
      : reading.status === 'pendiente'
        ? `${second ? 'lo tienes' : 'lo tiene'} por leer`
        : reading.status === 'dejado'
          ? `${second ? 'lo dejaste' : 'lo dejó'} en la ${fmtPosition(reading)}`
          : `${second ? 'vas' : 'va'} por la ${fmtProgress(reading)}`
  return (
    <li className="flex items-baseline gap-2.5">
      <span aria-hidden className="h-3 w-[7px] flex-none translate-y-px rounded-[1px]" style={{ background: color }} />
      <span>
        <span className="font-medium">{who}</span> <span className="quiet">{text}</span>
      </span>
    </li>
  )
}

function Tally({ who, sessions }: { who: string; sessions: Session[] }) {
  const { nights, minutes, place } = tally(sessions)
  return (
    <p>
      <span className="font-medium">{who}:</span>{' '}
      <span className="quiet">
        {[nights === 1 ? 'una noche' : `${nights} noches`, minutes > 0 && fmtMinutes(minutes), place && `sobre todo ${place}`]
          .filter(Boolean)
          .join(' · ')}
      </span>
    </p>
  )
}

function Evening({ session, unit }: { session: Session; unit: Unit }) {
  const read = session.to_pos - session.from_pos
  const range = unit === 'porcentaje' ? `hasta el ${session.to_pos} %` : read > 0 ? `p. ${session.from_pos}–${session.to_pos}` : `p. ${session.to_pos}`
  return (
    <li className="flex items-center gap-3 border-b border-rule py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[16.5px]">{fmtDay(session.day)}</p>
        <p className="quiet truncate text-[14.5px]">
          {[range, session.minutes && fmtMinutes(session.minutes), session.place].filter(Boolean).join(' · ')}
        </p>
      </div>
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
    </li>
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
          ¿Cuánto rato, más o menos? <span className="text-[14px]">(minutos, si quieres)</span>
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

/** The last page: the book goes to the shelf, and what you thought of it, if you want, into its envelope. */
function Finish({ reading, book, theirs, partner, onDone }: FinishProps) {
  const { db, me } = usePeople()
  const [rating, setRating] = useState<number | null>(null)
  const [letter, setLetter] = useState('')
  const hasLetter = Object.values(db.slips).some(
    (s) => s.book_id === book.id && s.user_id === me.id && s.kind === 'carta' && !s.deleted_at,
  )
  const theirOpen = theirs?.status === 'leyendo' || theirs?.status === 'pendiente'
  return (
    <div className="flex flex-col gap-6">
      <p className="quiet">La última página. El libro pasa a la estantería con tu cinta.</p>
      {!hasLetter && (
        <div>
          <p className="label">
            Tu valoración, para el sobre <span className="text-[14px]">(si quieres)</span>
          </p>
          <Stars value={rating} onChange={setRating} />
          <div className="slip">
            <textarea
              className="hand block min-h-[112px] w-full resize-none bg-transparent leading-[28px] outline-none placeholder:opacity-45"
              maxLength={4000}
              placeholder="Qué te ha parecido, con tus palabras…"
              aria-label="Tu valoración"
              value={letter}
              onChange={(event) => setLetter(event.currentTarget.value)}
            />
          </div>
          {partner && (
            <p className="quiet mt-2 text-[15px]">
              {theirOpen
                ? `${partner.name} no la verá hasta que lo termine y haya puesto la suya.`
                : theirs?.status === 'terminado'
                  ? `${partner.name} la verá cuando haya puesto la suya. Y tú, la suya.`
                  : `${partner.name} podrá verla.`}
            </p>
          )}
        </div>
      )}
      <button
        className="btn btn-primary"
        onClick={() => {
          finishReading(reading)
          if (!hasLetter) leaveVerdict(book, rating, letter)
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
  const [cover, setCover] = useState(book.cover_url ?? '')
  /** Covers found for this title: undefined before looking, null while looking. */
  const [found, setFound] = useState<string[] | null | undefined>(undefined)
  const { remote } = useSession()
  const [uploading, setUploading] = useState<'no' | 'yes' | 'failed'>('no')
  // A photo in the rehearsal lives inside its own address; on the real server every cover is an https one.
  const validCover =
    cover.trim() === '' || /^https:\/\/\S+$/.test(cover.trim()) || (remote.ensayo && cover.startsWith('data:image/'))
  const upload = (file: File | undefined) => {
    if (!file) return
    setUploading('yes')
    shrinkCover(file)
      .then((image) => remote.uploadCover(image))
      .then((url) => {
        setCover(url)
        setUploading('no')
      })
      .catch(() => setUploading('failed'))
  }
  const look = () => {
    setFound(null)
    searchBooks(`${title} ${author}`.trim(), new AbortController().signal)
      .then((books) => setFound([...new Set(books.map((b) => b.cover_url).filter((url): url is string => !!url))].slice(0, 9)))
      .catch(() => setFound([]))
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !validCover) return
    editBook(book, {
      title: title.trim(),
      author: author.trim(),
      pages: Number(pages) > 0 ? Number(pages) : null,
      cover_url: cover.trim() || null,
    })
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
      <fieldset className="mt-1">
        <legend className="label">Portada</legend>
        <div className="flex items-start gap-4">
          <Cover key={cover} book={{ ...book, title: title || book.title, author, cover_url: validCover && cover.trim() ? cover.trim() : null }} width={72} />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
            <label className="chip cursor-pointer focus-within:outline-2 focus-within:outline-[var(--flame)]">
              {uploading === 'yes' ? 'Subiendo…' : 'Subir una foto'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploading === 'yes'}
                onChange={(event) => {
                  upload(event.currentTarget.files?.[0])
                  event.currentTarget.value = ''
                }}
              />
            </label>
            <button type="button" className="chip" onClick={look}>
              Buscar portadas
            </button>
            {cover.trim() !== '' && (
              <button type="button" className="chip" onClick={() => setCover('')}>
                Quitarla y usar la de tela
              </button>
            )}
          </div>
        </div>
        {uploading === 'failed' && (
          <p role="alert" className="mt-3 text-[15px] text-danger">
            No se ha podido subir la foto. Hace falta conexión; prueba otra vez.
          </p>
        )}
        {found === null && <p className="quiet mt-3 text-[15px]">Buscando…</p>}
        {found?.length === 0 && <p className="quiet mt-3 text-[15px]">No he encontrado ninguna. Puedes pegar la dirección de una imagen.</p>}
        {!!found?.length && (
          <div className="mt-3 flex flex-wrap gap-3" role="radiogroup" aria-label="Portadas encontradas">
            {found.map((url) => (
              <button
                key={url}
                type="button"
                role="radio"
                aria-checked={cover === url}
                aria-label="Usar esta portada"
                className="rounded-[6px] transition-transform active:scale-95"
                style={{ boxShadow: cover === url ? '0 0 0 3px var(--surface), 0 0 0 5px var(--ink)' : 'none' }}
                onClick={() => setCover(url)}
              >
                <img src={url} alt="" width={58} height={87} loading="lazy" className="h-[87px] w-[58px] rounded-[3px] object-cover" />
              </button>
            ))}
          </div>
        )}
        <label className="label mt-4" htmlFor="edit-cover">O pega la dirección de una imagen</label>
        <input
          id="edit-cover"
          className="field"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="https://…"
          value={cover.startsWith('data:') ? '' : cover}
          onChange={(e) => setCover(e.currentTarget.value)}
        />
        {!validCover && <p className="mt-1 text-[15px] text-danger">Tiene que empezar por https://</p>}
      </fieldset>
      <button className="btn btn-primary mt-2" disabled={!title.trim() || !validCover || uploading === 'yes'}>Guardar</button>
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
