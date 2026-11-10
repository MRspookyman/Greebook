import { useState, type ReactNode } from 'react'
import { fmtDay, isoDate } from '@/lib/time'
import type { Slip } from '@/lib/types'
import { parseVerdict } from '@/lib/verdict'
import { Heart, Lock, Star } from './icons'

interface Props {
  slip: Slip
  /** I wrote it. */
  mine: boolean
  /** Who wrote it, as it should be said: «Javier», «Tú». */
  author: string
  /** The other one of you, for «lo encontró el…». */
  other: string
  /** The author's wax colour. */
  color: string
  /** Where it sits, in my terms: «p. 150». */
  place?: string
  /** Shown instead of the text while it is folded. */
  foldedLine?: string
  /** Shown above the text: «Tu predicción». */
  label?: string
  /** It lives in the envelope: it is «read», not «found». */
  letter?: boolean
  onOpen?: () => void
  onLove?: (loved: boolean) => void
  onEdit?: () => void
}

const day = (iso: string) => fmtDay(isoDate(new Date(iso)))

/** A slip of paper: folded while you can't read it, unfolded with a tap, and marked with whose it is. */
export function SlipPaper({ slip, mine, author, other, color, place, foldedLine, label, letter, onOpen, onLove, onEdit }: Props) {
  const [justOpened, setJustOpened] = useState(false)
  const folded = !mine && (slip.locked || slip.body == null)
  const unopened = !mine && !folded && !slip.seen_at
  const tab = <span aria-hidden className="absolute inset-y-0 left-0 w-[5px] rounded-l-[3px]" style={{ background: color }} />

  if (folded) {
    return (
      <div className="slip slip-folded flex items-center gap-3 !py-3 opacity-90">
        {tab}
        <Lock size={18} className="flex-none opacity-50" />
        <p className="text-[16px] leading-snug">
          <span className="font-medium">{[place, `de ${author}`].filter(Boolean).join(' · ')}</span>
          <span className="block opacity-70">{foldedLine ?? 'Lo encontrarás al llegar.'}</span>
        </p>
      </div>
    )
  }

  if (unopened) {
    return (
      <button
        type="button"
        className="slip slip-folded pressable block w-full text-left"
        onClick={() => {
          setJustOpened(true)
          onOpen?.()
        }}
      >
        {tab}
        <span className="hand block">{author} te dejó algo{place ? ` en la ${place}` : ''}</span>
        <span className="mt-1 block text-[15px] opacity-70">Toca para desdoblarlo</span>
      </button>
    )
  }

  const verdict = slip.kind === 'carta' ? parseVerdict(slip.body) : { rating: null, text: slip.body ?? '' }
  let footer: ReactNode
  if (mine) {
    footer = slip.seen_at ? (
      <>
        {slip.loved && <Heart size={15} filled className="mr-1.5 inline -translate-y-px text-[#b8354f]" />}
        {other} {letter ? 'la vio' : 'lo encontró'} el {day(slip.seen_at)}
      </>
    ) : (
      letter ? `${other} aún no la ha visto` : `${other} aún no lo ha encontrado`
    )
  } else footer = `${author}, el ${day(slip.created_at)}`

  return (
    <div className={`slip ${justOpened ? 'unfold' : ''}`}>
      {tab}
      {(label || place) && (
        <p className="mb-1 text-[12px] font-semibold tracking-[0.14em] uppercase opacity-55">
          {[label, place].filter(Boolean).join(' · ')}
        </p>
      )}
      {verdict.rating && (
        <p className="mb-1 flex gap-0.5 text-[#b0791a]" role="img" aria-label={verdict.rating === 1 ? 'Una estrella' : `${verdict.rating} estrellas`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={21} filled={n <= verdict.rating!} />
          ))}
        </p>
      )}
      {verdict.text && (
        <p className={`whitespace-pre-wrap break-words ${slip.kind === 'cita' ? 'text-[19px] leading-[28px] italic' : 'hand leading-[28px]'}`}>
          {verdict.text}
        </p>
      )}
      <div className="mt-2 flex min-h-8 items-center justify-between gap-3 text-[14px] opacity-70">
        <span>{footer}</span>
        {mine && onEdit && (
          <button type="button" className="-my-2 min-h-11 px-1 underline underline-offset-4" onClick={onEdit}>
            Cambiar
          </button>
        )}
        {!mine && onLove && (
          <button
            type="button"
            aria-pressed={slip.loved}
            aria-label={slip.loved ? 'Te ha llegado. Quitar' : 'Decirle que te ha llegado'}
            className="-my-2 -mr-2 grid h-11 w-11 place-items-center rounded-full transition-transform active:scale-90"
            style={{ color: slip.loved ? '#b8354f' : 'inherit' }}
            onClick={() => onLove(!slip.loved)}
          >
            <Heart size={22} filled={slip.loved} />
          </button>
        )}
      </div>
    </div>
  )
}
