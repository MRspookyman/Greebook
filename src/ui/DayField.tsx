import { useState } from 'react'
import { addDays, fmtDay } from '@/lib/time'

interface Props {
  /** The night chosen, 'yyyy-mm-dd'. */
  value: string
  onChange: (day: string) => void
  /** Tonight: nothing later can be chosen. */
  today: string
  label?: string
}

/** Which night something happened: tonight, last night, or any other day before, picked on a calendar. */
export function DayField({ value, onChange, today, label = '¿Qué día?' }: Props) {
  const yesterday = addDays(today, -1)
  // The calendar stays open once asked for, even if the day picked happens to be yesterday.
  const [other, setOther] = useState(value !== today && value !== yesterday)
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="chip" aria-pressed={!other && value === today} onClick={() => { setOther(false); onChange(today) }}>
          Hoy
        </button>
        <button type="button" className="chip" aria-pressed={!other && value === yesterday} onClick={() => { setOther(false); onChange(yesterday) }}>
          Ayer
        </button>
        <button type="button" className="chip" aria-pressed={other} onClick={() => setOther(true)}>
          {other ? fmtDay(value, today) : 'Otro día'}
        </button>
      </div>
      {other && (
        <input
          className="field mt-3"
          type="date"
          aria-label="Día"
          max={today}
          value={value}
          onChange={(event) => event.currentTarget.value && onChange(event.currentTarget.value)}
        />
      )}
    </div>
  )
}
