import { useState } from 'react'
import { updateMe } from '@/lib/actions'
import { usePeople } from '@/session'
import { Candle } from '@/ui/Candle'
import { ColorPicker } from '@/ui/ColorPicker'
import { COLORS } from '@/lib/types'

/** The first time: your name and the colour of your candle. Nothing else is asked, ever. */
export function Welcome() {
  const { me, partner } = usePeople()
  const [name, setName] = useState(me.name)
  const [color, setColor] = useState(me.color === partner?.color ? COLORS.find((c) => c !== partner.color)! : me.color)

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-7 pt-safe pb-safe">
      <div className="rise flex justify-center">
        <Candle color={color} lit size={104} />
      </div>
      <h1 className="display rise mt-4" style={{ '--i': 1 } as React.CSSProperties}>
        Esta es tu vela
      </h1>
      <p className="quiet rise mt-3" style={{ '--i': 2 } as React.CSSProperties}>
        La enciendes cuando te pones a leer.
        {partner ? ` ${partner.name} la verá encendida esté donde esté, y tú verás la suya.` : ''}
      </p>
      <div className="rise mt-8 flex flex-col gap-6" style={{ '--i': 3 } as React.CSSProperties}>
        <div>
          <label className="label" htmlFor="name">
            ¿Cómo te llama?
          </label>
          <input
            id="name"
            className="field"
            value={name}
            maxLength={40}
            autoComplete="given-name"
            onChange={(event) => setName(event.currentTarget.value)}
          />
        </div>
        <div>
          <p className="label">El color de tu cera</p>
          <ColorPicker value={color} onChange={setColor} taken={partner?.color} takenBy={partner?.name} />
        </div>
        <button
          className="btn btn-primary mt-2"
          disabled={!name.trim()}
          onClick={() => updateMe({ name: name.trim(), color, welcomed_at: new Date().toISOString() })}
        >
          Entrar en la habitación
        </button>
      </div>
    </main>
  )
}
