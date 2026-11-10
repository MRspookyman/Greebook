import { useState, type ReactNode } from 'react'
import { fmtDay, isoDate } from '@/lib/time'
import type { Slip } from '@/lib/types'
import { Heart, Lock } from './icons'

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
export function SlipPaper({ slip, mine, author, other, color, place, label, letter, onOpen, onLove, onEdit }: Props) {
  const [justOpened, setJustOpened] = useState(false)
  const folded = !mine && (slip.locked || slip.body == null)
  const unopened = !mine && !folded && !slip.seen_at
  const tab = <span aria-hidden className="absolute inset-y-0 left-0 w-[5px] rounded-l-[3px]" style={{ background: color }} />

  const seal = (
    <span aria-hidden className="inline-block h-[11px] w-[11px] flex-none rounded-full" style={{ background: color, boxShadow: '0 0 0 1px rgb(0 0 0 / 0.18)' }} />
  )

  if (folded) {
    return (
      <div className="slip slip-folded flex items-center gap-3 !py-3 opacity-90">
        {tab}
        <Lock size={18} className="flex-none opacity-50" />
        <p className="text-[16px] leading-snug">
          <span className="flex items-center gap-2 font-medium">
            {seal}
            {[place, `de ${author}`].filter(Boolean).join(' · ')}
          </span>
          <span className="block opacity-70">Lo encontrarás al llegar.</span>
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
        <span className="mb-1 flex items-center gap-2 text-[12.5px] font-semibold tracking-[0.14em] uppercase">
          {seal}
          <span className="opacity-70">{author}</span>
        </span>
        <span className="hand block">{author} te dejó algo{place ? ` en la ${place}` : ''}</span>
        <span className="mt-1 block text-[15px] opacity-70">Toca para desdoblarlo</span>
      </button>
    )
  }

  let footer: ReactNode
  if (mine) {
    footer = slip.seen_at ? (
      <>
        {slip.loved && <Heart size={15} filled className="mr-1.5 inline -translate-y-px text-[#b8354f]" />}
        {other} {letter ? 'lo leyó' : 'lo encontró'} el {day(slip.seen_at)}
      </>
    ) : (
      `${other} aún no lo ha ${letter ? 'leído' : 'encontrado'}`
    )
  } else footer = `${author}, el ${day(slip.created_at)}`

  return (
    <div className={`slip ${justOpened ? 'unfold' : ''}`}>
      {tab}
      <p className="mb-1 flex items-center gap-2 text-[12.5px] font-semibold tracking-[0.14em] uppercase">
        {seal}
        <span className="opacity-70">{[label ?? author, place].filter(Boolean).join(' · ')}</span>
      </p>
      <p className={`whitespace-pre-wrap break-words ${slip.kind === 'cita' ? 'text-[19px] leading-[28px] italic' : 'hand leading-[28px]'}`}>
        {slip.body}
      </p>
      <div className="mt-2 flex min-h-8 items-center justify-between gap-3 text-[15px] opacity-75">
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
