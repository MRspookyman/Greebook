import { useMemo, useState } from 'react'
import { openSlip, rateReading } from '@/lib/actions'
import { fractionOf } from '@/lib/lock'
import { fmtPosition, type BookView } from '@/lib/model'
import { papersOf, reviewsOf, slipPlace } from '@/lib/slips'
import type { Slip } from '@/lib/types'
import { usePeople } from '@/session'
import { Paper } from '@/ui/icons'
import { Sheet } from '@/ui/Sheet'
import { SlipPaper } from '@/ui/SlipPaper'
import { Stars } from '@/ui/Stars'
import { Wax, type Person } from '@/ui/Who'
import { WriteSlip } from '@/ui/WriteSlip'

/**
 * «Lo que os pareció»: the review of the book, apart from the notes. The stars and what each of you wrote
 * about it as a whole, side by side and always open to both.
 */
export function BookReviews({ view }: { view: BookView }) {
  const { db, me, partner } = usePeople()
  const { book, mine, theirs } = view
  const [writing, setWriting] = useState<null | { editing?: Slip }>(null)
  const reviews = useMemo(() => reviewsOf(db, book.id), [db, book.id])
  const myTexts = reviews.filter((slip) => slip.user_id === me.id)
  const theirTexts = reviews.filter((slip) => slip.user_id !== me.id && slip.body)
  const done = mine?.status === 'terminado'
  const theirStars = theirs?.status === 'terminado' ? theirs.rating : null
  if (!done && !myTexts.length && !theirTexts.length && !theirStars) return null

  const person = (who: Person, name: string, stars: React.ReactNode, texts: Slip[], own: boolean) => (
    <div className="note">
      <span aria-hidden className="absolute inset-y-0 left-0 w-[6px]" style={{ background: who === 'me' ? 'var(--me)' : 'var(--you)' }} />
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-3">
        <span className="flex items-center gap-2 text-[16.5px]">
          <Wax who={who} /> <span className="font-medium">{name}</span>
        </span>
        {stars}
      </div>
      {texts.map((slip) => (
        <div key={slip.id} className="mt-1.5">
          <p className="text-[17.5px] leading-[1.45] break-words whitespace-pre-wrap">{slip.body}</p>
          {own && (
            <button type="button" className="quiet -ml-1 min-h-11 px-1 text-[15px] underline decoration-rule underline-offset-4" onClick={() => setWriting({ editing: slip })}>
              Cambiar
            </button>
          )}
        </div>
      ))}
      {own && !texts.length && (
        <button type="button" className="btn btn-soft mt-2 w-full !min-h-11 !text-[16.5px]" onClick={() => setWriting({})}>
          Escribir lo que me pareció
        </button>
      )}
    </div>
  )

  return (
    <section id="valoracion" className="mt-10 scroll-mt-6" aria-labelledby="valoracion-title">
      <h2 id="valoracion-title" className="eyebrow mb-3">
        {partner ? 'Lo que os pareció' : 'Lo que te pareció'}
      </h2>
      <div className="flex flex-col gap-3">
        {(done || myTexts.length > 0) &&
          person(
            'me',
            'Tú',
            done && mine ? <Stars value={mine.rating} onChange={(rating) => rateReading(mine, rating)} /> : null,
            myTexts,
            true,
          )}
        {partner &&
          (theirTexts.length > 0 || theirStars) &&
          person(
            'you',
            partner.name,
            theirStars ? (
              <span className="text-[18px] tracking-[0.08em] text-flame-ink" aria-label={`${theirStars} de 5 estrellas`}>
                {'★'.repeat(theirStars)}
                <span className="opacity-30">{'★'.repeat(5 - theirStars)}</span>
              </span>
            ) : null,
            theirTexts,
            false,
          )}
      </div>

      <Sheet open={!!writing} onClose={() => setWriting(null)} title={writing?.editing ? 'Cambiar tu valoración' : 'Lo que te pareció'}>
        {writing && <WriteSlip book={book} mine={mine} partner={partner} review editing={writing.editing} onDone={() => setWriting(null)} />}
      </Sheet>
    </section>
  )
}

/**
 * «Entre páginas»: the notes of the book, each on its page. They are drawn first on the line of the book,
 * next to your two bookmarks, so you can see where something waits; then listed in reading order.
 */
export function BookSlips({ view }: { view: BookView }) {
  const { db, me, partner } = usePeople()
  const { book, mine, theirs } = view
  const [writing, setWriting] = useState<null | { editing?: Slip }>(null)
  const papers = useMemo(() => papersOf(db, book.id), [db, book.id])
  const name = partner?.name ?? 'Tu pareja'

  const place = (reading?: BookView['mine']) =>
    reading && reading.status !== 'pendiente' ? fractionOf(reading.position, reading.total) : null
  const myAt = place(mine)
  const theirAt = partner ? place(theirs) : null
  const readable = (slip: Slip) => slip.user_id === me.id || (!slip.locked && slip.body != null)
  const ahead = papers.filter((slip) => !readable(slip)).length
  const unread = papers.filter((slip) => slip.user_id !== me.id && readable(slip) && !slip.seen_at).length

  // My bookmark goes in among the notes, so it is clear which ones are still ahead.
  const reading = mine?.status === 'leyendo' && myAt != null
  const here = papers.findIndex((slip) => reading && slip.at! > myAt!)
  const marker = mine && reading && papers.length > 0 && (
    <li key="here" className="flex items-center gap-3 py-1 text-[13.5px] font-semibold tracking-[0.14em] uppercase" aria-label={`Vas por la ${fmtPosition(mine)}`}>
      <span className="h-px flex-1 bg-rule" />
      <Wax who="me" />
      <span className="quiet">Tú, {fmtPosition(mine)}</span>
      <span className="h-px flex-1 bg-rule" />
    </li>
  )
  const left = (at: number) => `clamp(7px, ${at * 100}%, calc(100% - 7px))`

  return (
    <>
      <section id="papeles" className="mt-10 scroll-mt-6" aria-labelledby="papeles-title">
        <h2 id="papeles-title" className="eyebrow mb-3">
          Entre páginas
        </h2>

        {papers.length > 0 && (
          <div className="mb-4">
            {/* The book as a line: a dot where each note sits (hollow while it is hidden from me), and a ribbon for each bookmark. */}
            <div className="relative h-9" aria-hidden>
              <div className="absolute inset-x-0 top-[22px] h-[3px] rounded-full bg-rule" />
              {myAt != null && <div className="absolute top-[22px] left-0 h-[3px] rounded-full bg-ink/30" style={{ width: `${myAt * 100}%` }} />}
              {papers.map((slip) => {
                const color = slip.user_id === me.id ? 'var(--me)' : 'var(--you)'
                return (
                  <span
                    key={slip.id}
                    className="absolute top-[17px] h-[13px] w-[13px] -translate-x-1/2 rounded-full"
                    style={{
                      left: left(slip.at!),
                      background: readable(slip) ? color : 'var(--bg)',
                      border: `2.5px solid ${color}`,
                      boxShadow: '0 0 0 2px var(--bg)',
                    }}
                  />
                )
              })}
              {[theirAt != null && { at: theirAt, color: 'var(--you)' }, myAt != null && { at: myAt, color: 'var(--me)' }]
                .filter((m): m is { at: number; color: string } => !!m)
                .map((mark, i) => (
                  <span
                    key={i}
                    className="absolute top-0 h-[15px] w-[7px] -translate-x-1/2 rounded-[1.5px]"
                    style={{ left: left(mark.at), background: mark.color, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 76%, 0 100%)' }}
                  />
                ))}
            </div>
            <p className="quiet mt-1 text-[15px]">
              {[
                papers.length === 1 ? 'Una nota' : `${papers.length} notas`,
                unread > 0 && (unread === 1 ? 'una sin leer' : `${unread} sin leer`),
                ahead > 0 && (ahead === 1 ? `una te espera más adelante` : `${ahead} te esperan más adelante`),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        )}

        {papers.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {papers.flatMap((slip, i) => {
              const own = slip.user_id === me.id
              return [
                i === here && marker,
                <li key={slip.id}>
                  <SlipPaper
                    slip={slip}
                    mine={own}
                    author={own ? 'Tú' : name}
                    other={name}
                    color={own ? 'var(--me)' : 'var(--you)'}
                    place={slipPlace(slip, mine ?? (own ? undefined : theirs))}
                    onOpen={() => openSlip(slip)}
                    onLove={(loved) => openSlip(slip, loved)}
                    onEdit={() => setWriting({ editing: slip })}
                  />
                </li>,
              ]
            })}
            {here === -1 && marker}
          </ul>
        ) : (
          <p className="quiet">
            Una frase que subrayarías, lo que te ha hecho sentir una página. Cada nota se queda en su página
            {partner ? `, a la vista o escondida hasta que ${name} llegue a ella` : ''}.
          </p>
        )}
        <button className="btn btn-soft mt-4 w-full" onClick={() => setWriting({})}>
          <Paper size={20} /> Escribir una nota
        </button>
      </section>

      <Sheet open={!!writing} onClose={() => setWriting(null)} title={writing?.editing ? 'Cambiar la nota' : 'Una nota entre páginas'}>
        {writing && <WriteSlip book={book} mine={mine} partner={partner} editing={writing.editing} onDone={() => setWriting(null)} />}
      </Sheet>
    </>
  )
}
