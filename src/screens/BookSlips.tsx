import { useMemo, useState } from 'react'
import { openSlip } from '@/lib/actions'
import { fractionOf } from '@/lib/lock'
import { fmtPosition, type BookView } from '@/lib/model'
import { papersOf, slipPlace } from '@/lib/slips'
import type { Slip } from '@/lib/types'
import { usePeople } from '@/session'
import { Paper } from '@/ui/icons'
import { Sheet } from '@/ui/Sheet'
import { SlipPaper } from '@/ui/SlipPaper'
import { Wax } from '@/ui/Who'
import { WriteSlip } from '@/ui/WriteSlip'

/**
 * «Entre páginas»: the one way of writing inside a book. A note about a page, a passage or the whole book,
 * for the other one or for yourself, and always readable by both.
 */
export function BookSlips({ view }: { view: BookView }) {
  const { db, me, partner } = usePeople()
  const { book, mine, theirs } = view
  const [writing, setWriting] = useState<null | { editing?: Slip }>(null)
  const papers = useMemo(() => papersOf(db, book.id), [db, book.id])
  const name = partner?.name ?? 'Tu pareja'

  // My bookmark goes in among the notes, so it is clear which ones are still ahead.
  const myAt = mine && mine.status === 'leyendo' ? fractionOf(mine.position, mine.total) : null
  const here = papers.findIndex((slip) => slip.at != null && myAt != null && slip.at > myAt)
  const marker = mine && myAt != null && papers.some((s) => s.at != null) && (
    <li key="here" className="flex items-center gap-3 py-1 text-[13.5px] font-semibold tracking-[0.14em] uppercase" aria-label={`Vas por la ${fmtPosition(mine)}`}>
      <span className="h-px flex-1 bg-rule" />
      <Wax who="me" />
      <span className="quiet">Tú, {fmtPosition(mine)}</span>
      <span className="h-px flex-1 bg-rule" />
    </li>
  )

  return (
    <>
      <section id="papeles" className="mt-12 scroll-mt-6" aria-labelledby="papeles-title">
        <h2 id="papeles-title" className="eyebrow mb-3">
          Entre páginas
        </h2>
        {papers.length > 0 ? (
          <ul className="flex flex-col gap-3">
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
                    place={slipPlace(slip, mine ?? (own ? undefined : theirs)) || 'El libro entero'}
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
            Una frase que subrayarías, lo que te ha hecho sentir una página, lo que ha sido el libro para ti. Cada nota se
            queda en su sitio del libro{partner ? ' y la veis los dos' : ''}.
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
