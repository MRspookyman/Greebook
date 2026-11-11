import { useId, type ReactNode } from 'react'
import { toggleFolded, useFolded } from '@/lib/folded'
import { Chevron } from './icons'

interface Props {
  /** What is remembered as folded: «mesilla:both», «estanteria:2026». */
  id: string
  /** What stays in view: the name of the part and how much is in it. */
  header: ReactNode
  /** Kept open whatever was remembered (while searching, say). */
  open?: boolean
  className?: string
  children: ReactNode
}

/** A part of the room that folds away under its own heading, and stays that way until you open it again. */
export function Fold({ id, header, open: forced = false, className = '', children }: Props) {
  const folded = useFolded().has(id) && !forced
  const panel = useId()
  return (
    <div className={className}>
      <button
        type="button"
        className="-mx-2 flex min-h-11 w-[calc(100%+16px)] items-center justify-between gap-3 rounded-[12px] px-2 text-left"
        aria-expanded={!folded}
        aria-controls={panel}
        onClick={() => toggleFolded(id)}
      >
        <span className="min-w-0 flex-1">{header}</span>
        <Chevron size={20} className="quiet flex-none transition-transform duration-200" style={{ rotate: folded ? '-90deg' : '0deg' }} />
      </button>
      <div id={panel} hidden={folded}>
        {children}
      </div>
    </div>
  )
}
