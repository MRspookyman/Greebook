import { useState } from 'react'
import { useNavigate } from 'react-router'
import { updateMe } from '@/lib/actions'
import { useSyncStatus } from '@/lib/sync/store'
import { usePeople, useSession } from '@/session'
import { Candle } from '@/ui/Candle'
import { ColorPicker } from '@/ui/ColorPicker'
import { Back } from '@/ui/icons'

/** The little there is to adjust: who you are here. */
export function Settings() {
  const { me, partner } = usePeople()
  const { remote, signOut } = useSession()
  const status = useSyncStatus()
  const navigate = useNavigate()
  const [name, setName] = useState(me.name)
  const [leaving, setLeaving] = useState(false)

  return (
    <main className="fade mx-auto min-h-dvh max-w-xl px-5 pb-16" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}>
      <button className="icon-btn -ml-2" aria-label="Volver a la habitación" onClick={() => navigate(-1)}>
        <Back />
      </button>
      <div className="mt-2 flex items-end gap-3">
        <div className="-ml-2">
          <Candle color={me.color} lit size={60} />
        </div>
        <h1 className="display pb-3">Tu vela</h1>
      </div>

      <section className="mt-6 flex flex-col gap-6">
        <div>
          <label className="label" htmlFor="name">
            Tu nombre
          </label>
          <input
            id="name"
            className="field"
            value={name}
            maxLength={40}
            onChange={(event) => setName(event.currentTarget.value)}
            onBlur={() => name.trim() && name.trim() !== me.name && updateMe({ name: name.trim() })}
          />
        </div>
        <div>
          <p className="label">El color de tu cera</p>
          <ColorPicker
            value={me.color}
            onChange={(color) => updateMe({ color })}
            taken={partner?.color}
            takenBy={partner?.name}
          />
        </div>
      </section>

      <section className="mt-12 border-t border-rule pt-6">
        <p className="quiet text-[16px]">
          {remote.ensayo
            ? 'Modo ensayo: todo se guarda solo en este navegador.'
            : status.pending
              ? `${status.pending === 1 ? 'Un cambio espera' : `${status.pending} cambios esperan`} a que haya conexión.`
              : 'Todo está guardado.'}
        </p>
        {leaving ? (
          <div className="mt-4 flex flex-col gap-3">
            <p>
              {status.pending
                ? 'Si sales ahora se pierden los cambios que aún no se han subido.'
                : 'Al salir, este móvil olvida lo vuestro. Volverá al entrar.'}
            </p>
            <div className="flex gap-3">
              <button className="btn btn-soft" onClick={() => setLeaving(false)}>
                Me quedo
              </button>
              <button className="btn btn-line btn-danger" onClick={() => void signOut()}>
                Salir
              </button>
            </div>
          </div>
        ) : (
          <button className="btn-text btn -ml-2 mt-2" onClick={() => setLeaving(true)}>
            Cerrar sesión
          </button>
        )}
        <p className="quiet mt-8 text-[13px]">Greenbook · {__APP_VERSION__}</p>
      </section>
    </main>
  )
}
