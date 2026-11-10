import { useMemo, useState } from 'react'
import { knownPlaces, live } from '@/lib/model'
import { usePeople } from '@/session'

const DEFAULT_PLACES = ['en la cama', 'en el sofá', 'en el tren']

/** The same familiar places when saving or correcting an evening. */
export function PlaceField({ value, onChange }: { value: string | null; onChange: (place: string | null) => void }) {
  const { db, me } = usePeople()
  const places = useMemo(
    () => [...new Set([...knownPlaces(live(db.sessions), me.id), ...DEFAULT_PLACES])].slice(0, 5),
    [db.sessions, me.id],
  )
  const [other, setOther] = useState(() => !!value && !places.includes(value))
  return (
    <div>
      <p className="quiet mb-2">¿Dónde? <span className="text-[15px]">(si quieres)</span></p>
      <div className="flex flex-wrap gap-2">
        {places.map((name) => (
          <button key={name} type="button" className="chip" aria-pressed={value === name && !other} onClick={() => {
            setOther(false)
            onChange(value === name ? null : name)
          }}>
            {name}
          </button>
        ))}
        <button type="button" className="chip" aria-pressed={other} onClick={() => {
          setOther(!other)
          onChange(null)
        }}>
          otro sitio
        </button>
      </div>
      {other && (
        <input className="field mt-3" autoFocus maxLength={40} placeholder="en el parque, en casa de…" aria-label="Otro sitio" value={value ?? ''} onChange={(event) => onChange(event.currentTarget.value)} />
      )}
    </div>
  )
}
