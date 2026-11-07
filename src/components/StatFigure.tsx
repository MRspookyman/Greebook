import type { ReactNode } from 'react'

interface Props {
  label: string
  value: ReactNode
  unit?: string
  /** Optional line under the value (a comparison, a date…). */
  note?: ReactNode
  size?: 'md' | 'lg'
}

/**
 * One data value with its label, in the interface sans (proportional figures).
 * Meant to sit inside a `<dl>` so the label/value pairing is announced.
 */
export function StatFigure({ label, value, unit, note, size = 'md' }: Props) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] leading-snug text-muted">{label}</dt>
      <dd className="mt-1 flex flex-wrap items-baseline gap-x-1">
        <span className={`figure ${size === 'lg' ? 'text-[44px]' : 'text-[22px]'}`}>{value}</span>
        {unit && <span className="text-sm text-muted">{unit}</span>}
      </dd>
      {note && <dd className="mt-0.5 text-xs leading-snug text-muted">{note}</dd>}
    </div>
  )
}
