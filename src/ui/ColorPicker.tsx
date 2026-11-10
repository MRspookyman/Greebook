import { COLORS, type Color } from '@/lib/types'

const NAMES: Record<Color, string> = {
  salvia: 'Salvia', miel: 'Miel', ciruela: 'Ciruela', cielo: 'Cielo', coral: 'Coral', lavanda: 'Lavanda',
}

interface Props {
  value: Color
  onChange: (color: Color) => void
  /** The partner's colour: shown, but not on offer. */
  taken?: Color
  takenBy?: string
}

/** Choose your wax. */
export function ColorPicker({ value, onChange, taken, takenBy }: Props) {
  return (
    <div role="radiogroup" aria-label="Color de tu vela" className="flex flex-wrap gap-3">
      {COLORS.map((color) => {
        const mine = color === value
        const theirs = color === taken
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={mine}
            aria-label={theirs ? `${NAMES[color]}, la de ${takenBy}` : NAMES[color]}
            disabled={theirs}
            onClick={() => onChange(color)}
            className="grid h-12 w-12 place-items-center rounded-full transition-transform active:scale-90 disabled:opacity-35"
            style={{
              background: `var(--${color})`,
              boxShadow: mine ? '0 0 0 3px var(--bg), 0 0 0 5px var(--ink)' : 'inset 0 -6px 8px -4px rgb(0 0 0 / 0.25)',
            }}
          />
        )
      })}
    </div>
  )
}
