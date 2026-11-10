import { useMemo, useState } from 'react'
import { openSlip } from '@/lib/actions'
import { fractionOf, isLocked } from '@/lib/lock'
import { fmtPosition, type BookView } from '@/lib/model'
import { envelopeOf, papersOf, slipPlace } from '@/lib/slips'
import type { Slip } from '@/lib/types'
import { usePeople } from '@/session'
import { Envelope as EnvelopeIcon, Paper } from '@/ui/icons'
import { Sheet } from '@/ui/Sheet'
import { SlipPaper } from '@/ui/SlipPaper'
import { WriteSlip } from '@/ui/WriteSlip'

type Writing = null | { what: 'papel' | 'prediccion' | 'carta'; editing?: Slip }

/** «Entre páginas» and «El sobre»: what the two of you have left in this book for each other. */
export function BookSlips({ view }: { view: BookView }) {
  const { db, me, partner } = usePeople()
  const { book, mine, theirs } = view
  const [writing, setWriting] = useState<Writing>(null)
  const papers = useMemo(() => papersOf(db, book.id), [db, book.id])
  const envelope = useMemo(() => envelopeOf(db, book.id, me.id), [db, book.id, me.id])
  const name = partner?.name ?? 'Tu pareja'

  const paper = (slip: Slip, label?: string, foldedLine?: string) => {
    const own = slip.user_id === me.id
    return (
      <SlipPaper
        key={slip.id}
        slip={slip}
        mine={own}
        author={own ? 'Tú' : name}
        other={name}
        color={own ? 'var(--me)' : 'var(--you)'}
        place={slipPlace(slip, mine ?? (own ? undefined : theirs))}
        label={label}
        letter={slip.kind === 'carta' || slip.kind === 'prediccion'}
        foldedLine={foldedLine}
        onOpen={() => openSlip(slip)}
        onLove={(loved) => openSlip(slip, loved)}
        onEdit={() => setWriting({ what: slip.kind === 'cita' || slip.kind === 'nota' ? 'papel' : slip.kind, editing: slip })}
      />
    )
  }

  // My bookmark goes in among the slips, so it is clear which ones are still ahead.
  const myAt = mine && mine.status === 'leyendo' ? fractionOf(mine.position, mine.total) : null
  const here = papers.findIndex((slip) => slip.at != null && myAt != null && slip.at > myAt)
  const marker = mine && myAt != null && papers.some((s) => s.at != null) && (
    <li key="here" className="flex items-center gap-3 py-1 text-[13px] font-semibold tracking-[0.14em] uppercase" aria-label={`Vas por la ${fmtPosition(mine)}`}>
      <span className="h-px flex-1 bg-rule" />
      <span className="h-3 w-[7px] rounded-[1px]" style={{ background: 'var(--me)' }} aria-hidden />
      <span className="quiet">Tú, {fmtPosition(mine)}</span>
      <span className="h-px flex-1 bg-rule" />
    </li>
  )

  const myOpen = mine?.status === 'leyendo' || mine?.status === 'pendiente'
  const theirOpen = theirs?.status === 'leyendo' || theirs?.status === 'pendiente'
  const canWrite = !envelope.mine.carta && mine?.status === 'terminado'
  const opened = (slip?: Slip) => !!slip && !slip.locked && slip.body != null && !!slip.seen_at
  let sealedLine = ''
  if (envelope.sealed) {
    if (myOpen) sealedLine = theirOpen ? 'Se abre cuando los dos lo terminéis.' : 'Se abre cuando lo termines.'
    else if (envelope.theirs.carta?.locked && !envelope.mine.carta && mine?.status === 'terminado') {
      sealedLine = `Pon tu valoración y se abre la de ${name}.`
    } else if (theirOpen) sealedLine = `Se abre cuando ${name} lo termine.`
  }

  // What I put in: is it still closed for them, and what are we waiting for?
  const waitsForThem = partner
    ? [envelope.mine.prediccion, envelope.mine.carta].filter(
        (slip): slip is Slip => !!slip && isLocked(slip, partner.id, theirs, mine, !!envelope.theirs.carta),
      )
    : []
  let status: string
  if (envelope.empty) {
    status = partner
      ? `Al terminar, cada uno mete aquí su valoración. Se abre cuando estén las dos: ninguno ve la del otro antes.`
      : 'Al terminar, aquí va tu valoración del libro.'
  }
  else if (envelope.toOpen.length) {
    status = `Ya puedes abrirlo: dentro está la valoración de ${name}.`
  } else if (sealedLine) status = sealedLine
  else if (waitsForThem.length) {
    status = theirOpen
      ? `Cerrado para ${name} hasta que termine el libro.`
      : myOpen
        ? 'Cerrado hasta que lo termines.'
        : `${name} lo abrirá cuando ponga su valoración.`
  } else status = 'Abierto.'

  return (
    <>
      <section id="papeles" className="mt-12 scroll-mt-6" aria-labelledby="papeles-title">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="papeles-title" className="eyebrow">
            Entre páginas
          </h2>
        </div>
        {papers.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {papers.flatMap((slip, i) => [i === here && marker, <li key={slip.id}>{paper(slip)}</li>])}
            {here === -1 && marker}
          </ul>
        ) : (
          <p className="quiet">
            Una frase subrayada, unas palabras para {name}. Se quedan en su página y esperan a que el otro llegue.
          </p>
        )}
        <button className="btn btn-soft mt-4 w-full" onClick={() => setWriting({ what: 'papel' })}>
          <Paper size={20} /> Dejar un papel
        </button>
      </section>

      <section id="sobre" className="mt-12 scroll-mt-6" aria-labelledby="sobre-title">
        <h2 id="sobre-title" className="eyebrow mb-3">
          El sobre
        </h2>
        <div className="rounded-[22px] border-[1.5px] border-rule p-4">
          <div className="flex items-start gap-3">
            <EnvelopeIcon size={26} className="mt-0.5 flex-none text-flame-ink" />
            <p className="text-[17px] leading-snug">
              {status}
            </p>
          </div>

          {!envelope.empty && (
            <div className="mt-4 flex flex-col gap-3">
              {envelope.mine.prediccion && paper(envelope.mine.prediccion, 'Tu predicción')}
              {envelope.theirs.prediccion &&
                (opened(envelope.theirs.prediccion)
                  ? paper(envelope.theirs.prediccion, `La predicción de ${name}`)
                  : envelope.theirs.prediccion.locked && <Sealed>{name} ha metido una predicción.</Sealed>)}
              {envelope.mine.carta && paper(envelope.mine.carta, 'Tu valoración')}
              {envelope.theirs.carta &&
                (opened(envelope.theirs.carta)
                  ? paper(envelope.theirs.carta, `La valoración de ${name}`)
                  : envelope.theirs.carta.locked && <Sealed>{name} ya ha puesto su valoración.</Sealed>)}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 empty:hidden">
            {envelope.toOpen.length > 0 && (
              <button className="btn btn-primary" onClick={() => envelope.toOpen.forEach((slip) => openSlip(slip))}>
                Abrir el sobre
              </button>
            )}
            {canWrite && (
              <button className="btn btn-soft" onClick={() => setWriting({ what: 'carta' })}>
                Poner mi valoración
              </button>
            )}
          </div>
        </div>
      </section>

      <Sheet
        open={!!writing}
        onClose={() => setWriting(null)}
        title={
          writing?.editing
            ? writing.what === 'carta' ? 'Cambiar tu valoración' : 'Cambiar el papel'
            : writing?.what === 'carta'
              ? 'Tu valoración'
              : 'Un papel entre páginas'
        }
      >
        {writing && (
          <WriteSlip
            book={book}
            mine={mine}
            theirs={theirs}
            partner={partner}
            what={writing.what}
            editing={writing.editing}
            onDone={() => setWriting(null)}
          />
        )}
      </Sheet>
    </>
  )
}

function Sealed({ children }: { children: React.ReactNode }) {
  return (
    <p className="slip slip-folded !py-3 text-[16px]">
      <span aria-hidden className="absolute inset-y-0 left-0 w-[5px] rounded-l-[3px]" style={{ background: 'var(--you)' }} />
      {children}
    </p>
  )
}
