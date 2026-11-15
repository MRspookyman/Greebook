import { useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { burnedMinutes, finishReading, openSlip, saveEvening, snuffCandle } from '@/lib/actions'
import { fractionOf } from '@/lib/lock'
import { slipPlace } from '@/lib/slips'
import { sync } from '@/lib/sync/store'
import { fmtProgress, isLit, live, waxLeft } from '@/lib/model'
import { capital, fmtMinutes, fmtSince, greeting } from '@/lib/time'
import type { Reading } from '@/lib/types'
import { usePeople, useNow, useWink } from '@/session'
import { useLivingWall } from '@/lib/ambience'
import { glowOf } from '@/lib/candle'
import { Candle } from '@/ui/Candle'
import { CandleWall } from '@/ui/CandleWall'
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
  /** What was left of the candle when it was blown out: it stays that way while it smokes. */
  wax: number
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
  // The wall behind the candles needs to know where they stand, and which words to keep clear.
  const livingWall = useLivingWall()
  const mineRef = useRef<HTMLDivElement>(null)
  const theirsRef = useRef<HTMLButtonElement>(null)
  const wordsRef = useRef<HTMLDivElement>(null)
  const [winksSent, setWinksSent] = useState(0)

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
  // Blown out, the room stays as it was for a moment: same candles, same wall, the light going and the smoke rising.
  const out = farewell
  if (!out && (!me.candle_lit_at || !reading || reading.deleted_at || !book || book.deleted_at)) return <Navigate to="/" replace />
  const open = !out && reading && book && me.candle_lit_at ? { reading, book, litAt: me.candle_lit_at } : null

  const leave = (result: Farewell) => {
    setAsking(false)
    setFarewell({ ...result, goodbye: greeting(new Date()) === 'Buenas noches' ? 'Buenas noches' : 'Hasta luego' })
    setTimeout(
      () => (result.found?.length ? setHanding(true) : navigate(result.finished ? `/libro/${result.bookId}?cerrar=1` : '/', { replace: true })),
      3000,
    )
  }

  const myWax = out ? out.wax : waxLeft(me.candle_lit_at, now)
  const alight = !out && burning
  const theirWax = theirsLit ? waxLeft(partner?.candle_lit_at, now) : 1
  const sendWink = () => {
    setWinksSent((n) => n + 1)
    wink.send()
  }

  return (
    <main className="night fixed inset-0 flex flex-col overflow-x-clip overflow-y-auto overscroll-contain">
      {/* The room darkens as the candle burns down: a stub lights much less than a new one. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(70% 46% at 50% 36%, color-mix(in oklab, var(--flame) 26%, transparent), transparent 78%)',
          opacity: alight ? 0.2 + 0.8 * glowOf(myWax).strength : 0.08,
          transition: 'opacity 2s var(--ease)',
        }}
      />
      {livingWall && (
        <CandleWall mine={mineRef} theirs={theirsRef} mineLit={alight} snuffed={!!out} theirsLit={theirsLit} mineWax={myWax} theirWax={theirWax} quiet={wordsRef} winkIn={wink.received} winkOut={winksSent} />
      )}
      <header className="relative flex items-center px-3" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
        <button className={`icon-btn ${out ? 'invisible' : ''}`} aria-label="Volver; la vela sigue encendida" onClick={back}>
          <Back />
        </button>
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="flex items-end justify-center">
          {partner && (
            <button
              ref={theirsRef}
              type="button"
              className="-mr-2 mb-1 rounded-[14px] opacity-90"
              disabled={!(alight && theirsLit)}
              aria-label={theirsLit ? `La vela de ${partner.name}. Mandarle un guiño` : `La vela de ${partner.name}, apagada`}
              onClick={sendWink}
            >
              <Candle color={partner.color} lit={theirsLit} wax={theirWax} size={62} lean={1} tremble={wink.received} />
            </button>
          )}
          <div ref={mineRef}>
            <Candle color={me.color} lit={alight} wax={myWax} size={150} lean={theirsLit ? -1 : 0} smoke={!!out} />
          </div>
          {partner && <div className="w-[54px]" aria-hidden />}
        </div>
        <div ref={wordsRef}>
          {out ? (
            <div role="status">
              <h1 className="display fade mt-5">{out.goodbye}</h1>
              <p className="quiet fade mt-3 text-[19px]">
                {[
                  out.pages > 0 && (out.unit === 'porcentaje' ? `${out.pages} %` : out.pages === 1 ? 'una página' : `${out.pages} páginas`),
                  out.minutes && fmtMinutes(out.minutes),
                ]
                  .filter(Boolean)
                  .join(' · ') || (out.saved ? 'Velada guardada' : 'Vela apagada')}
              </p>
            </div>
          ) : (
            open && (
              <>
                <h1 className="mt-5 text-[27px] leading-tight italic">{open.book.title}</h1>
                <p className="quiet mt-2 text-[17px]">{`${capital(fmtProgress(open.reading))} · encendida ${fmtSince(open.litAt, now)}`}</p>
                {partner && theirsLit && (
                  <p className="mt-4 text-[17px] text-flame-ink">{partner.name} también está leyendo. Toca su vela para un guiño.</p>
                )}
              </>
            )
          )}
        </div>
      </div>

      {/* Kept in place, unseen, once the candle is out: the candles must not jump as the buttons go. */}
      <footer className={`relative mx-auto flex w-full max-w-md flex-col gap-1 px-6 ${out ? 'invisible' : ''}`} style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 22px)' }}>
        <button className="btn btn-primary" onClick={() => setAsking(true)}>
          Apagar la vela
        </button>
        <button className="btn btn-text self-center" onClick={() => setWriting(true)}>
          <Paper size={18} /> Dejar una nota entre estas páginas
        </button>
      </footer>

      <Sheet open={writing && !out} onClose={() => setWriting(false)} title="Una nota entre páginas" night>
        {writing && open && <WriteSlip book={open.book} mine={open.reading} partner={partner} onDone={() => setWriting(false)} />}
      </Sheet>

      <Sheet open={asking && !out} onClose={() => setAsking(false)} title="¿Por dónde vas?" night>
        {asking && open && <Snuff reading={open.reading} litAt={open.litAt} onDone={leave} />}
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
      wax: waxLeft(litAt, Date.now()),
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
            onDone({ bookId: reading.book_id, pages: 0, minutes: null, unit: reading.unit, finished: false, saved: false, wax: waxLeft(litAt, Date.now()) })
          }}
        >
          Al final no he leído
        </button>
      </div>
    </div>
  )
}
