import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { burnedMinutes, finishReading, openSlip, saveEvening, snuffCandle } from '@/lib/actions'
import { fractionOf } from '@/lib/lock'
import { slipPlace } from '@/lib/slips'
import { sync } from '@/lib/sync/store'
import { fmtProgress, isLit, live, waxLeft } from '@/lib/model'
import { capital, fmtMinutes, fmtSince, greeting } from '@/lib/time'
import type { Reading } from '@/lib/types'
import { usePeople, useNow, useWink } from '@/session'
import { Candle } from '@/ui/Candle'
import { Back, Paper } from '@/ui/icons'
import { MinutesField } from '@/ui/Minutes'
import { NumberDial } from '@/ui/NumberDial'
import { Sheet } from '@/ui/Sheet'
import { SlipPaper } from '@/ui/SlipPaper'
import { WriteSlip } from '@/ui/WriteSlip'
import { PlaceField } from '@/ui/PlaceField'
import { useBack } from '@/ui/useBack'

interface Farewell {
  /** «Buenas noches» or «Hasta luego», decided when the candle goes out. */
  goodbye?: string
  bookId: string
  pages: number
  minutes: number | null
  unit: Reading['unit']
  finished: boolean
  /** Hidden notes of theirs that this evening's pages have just uncovered. */
  found?: string[]
  saved: boolean
}

/** «La velada»: your candle is burning. The only things to do are read, and blow it out when you stop. */
export function Evening() {
  const { db, me, partner } = usePeople()
  const now = useNow(10_000)
  const navigate = useNavigate()
  const back = useBack()
  const wink = useWink(partner?.name)
  // «Apagar la vela» on the phone's notice lands here with the question already open.
  const [asking, setAsking] = useState(() => new URLSearchParams(window.location.search).has('apagar'))
  const [writing, setWriting] = useState(false)
  const [farewell, setFarewell] = useState<Farewell | null>(null)
  /** The goodbye has been said and there are notes to hand over before leaving. */
  const [handing, setHanding] = useState(false)

  const reading = me.candle_reading_id ? db.readings[me.candle_reading_id] : undefined
  const book = reading ? db.books[reading.book_id] : undefined
  const burning = isLit(me, now)
  const theirsLit = isLit(partner, now)

  if (farewell && handing && partner) {
    const leaveNow = () => navigate(farewell.finished ? `/libro/${farewell.bookId}?cerrar=1` : `/libro/${farewell.bookId}#papeles`, { replace: true })
    const notes = (farewell.found ?? []).map((id) => db.slips[id]).filter((slip) => slip && !slip.deleted_at)
    const mine = live(db.readings).find((r) => r.book_id === farewell.bookId && r.user_id === me.id)
    return (
      <main role="alertdialog" aria-labelledby="found-title" className="night fixed inset-0 overflow-y-auto overscroll-contain px-6" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 40px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 28px)' }}>
        <div className="mx-auto flex max-w-xl flex-col gap-5">
          <div className="text-center">
            <p className="eyebrow">Entre las páginas que has leído</p>
            <h1 id="found-title" className="display fade mt-2">
              {notes.length === 1 ? `Había una nota de ${partner.name}` : `Había ${notes.length} notas de ${partner.name}`}
            </h1>
          </div>
          {notes.map((slip) => (
            <div key={slip.id} className="drop">
              <SlipPaper
                slip={slip}
                mine={false}
                author={partner.name}
                other={partner.name}
                color="var(--you)"
                place={slipPlace(slip, mine)}
                opening
                onOpen={() => openSlip(slip)}
                onLove={(loved) => openSlip(slip, loved)}
              />
            </div>
          ))}
          <p className="quiet text-center text-[15.5px]">Se quedan en el libro, cada una en su página.</p>
          <button className="btn btn-primary" autoFocus onClick={leaveNow}>
            Seguir
          </button>
        </div>
      </main>
    )
  }
  if (farewell) {
    const amount = farewell.unit === 'porcentaje' ? `${farewell.pages} %` : farewell.pages === 1 ? 'una página' : `${farewell.pages} páginas`
    return (
      <main className="night fixed inset-0 flex flex-col items-center justify-center-safe overflow-y-auto overscroll-contain px-8 py-6 text-center">
        <Candle color={me.color} lit={false} wax={0.7} size={150} smoke />
        <h1 className="display fade mt-2">{farewell.goodbye}</h1>
        <p className="quiet fade mt-3 text-[19px]">
          {[farewell.pages > 0 && amount, farewell.minutes && fmtMinutes(farewell.minutes)].filter(Boolean).join(' · ') ||
            (farewell.saved ? 'Velada guardada' : 'Vela apagada')}
        </p>
      </main>
    )
  }
  if (!me.candle_lit_at || !reading || reading.deleted_at || !book || book.deleted_at) return <Navigate to="/" replace />

  const leave = (result: Farewell) => {
    setAsking(false)
    setFarewell({ ...result, goodbye: greeting(new Date()) === 'Buenas noches' ? 'Buenas noches' : 'Hasta luego' })
    setTimeout(
      () => (result.found?.length ? setHanding(true) : navigate(result.finished ? `/libro/${result.bookId}?cerrar=1` : '/', { replace: true })),
      1900,
    )
  }

  return (
    <main className="night fixed inset-0 flex flex-col overflow-x-clip overflow-y-auto overscroll-contain">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(70% 46% at 50% 36%, color-mix(in oklab, var(--flame) 26%, transparent), transparent 78%)',
          opacity: burning ? 1 : 0.15,
        }}
      />
      <header className="relative flex items-center px-3" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
        <button className="icon-btn" aria-label="Volver; la vela sigue encendida" onClick={back}>
          <Back />
        </button>
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="flex items-end justify-center">
          {partner && (
            <button
              type="button"
              className="-mr-2 mb-1 rounded-[14px] opacity-90"
              disabled={!(burning && theirsLit)}
              aria-label={theirsLit ? `La vela de ${partner.name}. Mandarle un guiño` : `La vela de ${partner.name}, apagada`}
              onClick={wink.send}
            >
              <Candle color={partner.color} lit={theirsLit} wax={theirsLit ? waxLeft(partner.candle_lit_at, now) : 1} size={62} lean={1} tremble={wink.received} />
            </button>
          )}
          <Candle color={me.color} lit={burning} wax={waxLeft(me.candle_lit_at, now)} size={150} lean={theirsLit ? -1 : 0} />
          {partner && <div className="w-[54px]" aria-hidden />}
        </div>
        <h1 className="mt-5 text-[27px] leading-tight italic">{book.title}</h1>
        <p className="quiet mt-2 text-[17px]">
          {burning ? `${capital(fmtProgress(reading))} · encendida ${fmtSince(me.candle_lit_at, now)}` : 'La vela se consumió mientras leías.'}
        </p>
        {partner && theirsLit && (
          <p className="mt-4 text-[17px] text-flame-ink">{partner.name} también está leyendo. Toca su vela para un guiño.</p>
        )}
      </div>

      <footer className="relative mx-auto flex w-full max-w-md flex-col gap-1 px-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 22px)' }}>
        <button className="btn btn-primary" onClick={() => setAsking(true)}>
          {burning ? 'Apagar la vela' : 'Guardar la velada'}
        </button>
        <button className="btn btn-text self-center" onClick={() => setWriting(true)}>
          <Paper size={18} /> Dejar una nota entre estas páginas
        </button>
      </footer>

      <Sheet open={writing} onClose={() => setWriting(false)} title="Una nota entre páginas" night>
        {writing && (
          <WriteSlip
            book={book}
            mine={reading}
            partner={partner}
            onDone={() => setWriting(false)}
          />
        )}
      </Sheet>

      <Sheet open={asking} onClose={() => setAsking(false)} title="¿Por dónde vas?" night>
        {asking && <Snuff reading={reading} litAt={me.candle_lit_at} onDone={leave} />}
      </Sheet>
    </main>
  )
}

/** Blowing the candle out asks one thing: where the bookmark goes. The rest is already filled in. */
function Snuff({ reading, litAt, onDone }: { reading: Reading; litAt: string; onDone: (farewell: Farewell) => void }) {
  const { db, me } = usePeople()
  const [position, setPosition] = useState(reading.position)
  const [minutes, setMinutes] = useState(() => burnedMinutes(litAt, Date.now()))
  const [place, setPlace] = useState<string | null>(null)
  const percent = reading.unit === 'porcentaje'

  const save = () => {
    // Hidden notes of theirs between where I was and where I am now: they are handed over on the way out.
    const from = fractionOf(reading.position, reading.total)
    const to = position >= reading.total ? 1 : fractionOf(position, reading.total)
    const found = live(db.slips)
      .filter((s) => s.book_id === reading.book_id && s.user_id !== me.id && s.hidden && s.at != null && !s.seen_at && s.at > from && s.at <= to)
      .sort((a, b) => a.at! - b.at!)
      .map((s) => s.id)
    saveEvening({ reading, position, minutes, place, startedAt: litAt })
    if (position >= reading.total) finishReading(reading, reading.rating)
    onDone({
      bookId: reading.book_id,
      pages: Math.max(0, position - reading.position),
      minutes,
      unit: reading.unit,
      finished: position >= reading.total,
      saved: true,
      found,
    })
    // The server is the one that hands their text over: ask now, not at the next tick.
    if (found.length) void sync()
  }

  return (
    <div className="flex flex-col gap-7 pt-2">
      <NumberDial
        value={position}
        onChange={setPosition}
        max={reading.total}
        label={percent ? 'Porcentaje del libro' : 'Página'}
        suffix={percent ? '% del libro' : `de ${reading.total} páginas`}
      />

      <div className="flex items-start justify-between gap-3">
        <span className="quiet pt-2.5">Has leído</span>
        <MinutesField value={minutes} onChange={setMinutes} />
      </div>

      <PlaceField value={place} onChange={setPlace} />

      <div className="flex flex-col gap-1">
        <button className="btn btn-primary" onClick={save}>
          {position >= reading.total ? 'Lo he terminado' : 'Apagar y guardar'}
        </button>
        <button
          className="btn btn-text self-center"
          onClick={() => {
            snuffCandle()
            onDone({ bookId: reading.book_id, pages: 0, minutes: null, unit: reading.unit, finished: false, saved: false })
          }}
        >
          Al final no he leído
        </button>
      </div>
    </div>
  )
}
