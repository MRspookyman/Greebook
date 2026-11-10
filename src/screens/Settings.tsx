import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { updateMe } from '@/lib/actions'
import { disablePush, enablePush, pushState, type PushState } from '@/lib/push'
import { getDb, useSyncStatus } from '@/lib/sync/store'
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
  const [push, setPush] = useState<PushState | null>(null)
  useEffect(() => {
    let alive = true
    void pushState(remote).then((state) => alive && setPush(state)).catch(() => {})
    return () => {
      alive = false
    }
  }, [remote])
  const partnerName = partner?.name ?? 'tu pareja'
  const PUSH_LINES: Record<PushState, string> = {
    on: `Este móvil te avisa cuando ${partnerName} enciende su vela, te deja un papel o encuentra uno tuyo.`,
    off: `Que este móvil te avise cuando ${partnerName} encienda su vela o te deje algo.`,
    denied: 'Los avisos están bloqueados para Greenbook en los ajustes de este móvil.',
    'needs-install': 'En el iPhone los avisos funcionan al añadir Greenbook a la pantalla de inicio (Compartir → Añadir a inicio).',
    unsupported: 'Este navegador no admite avisos.',
    unconfigured: 'Los avisos aún no están configurados en este despliegue.',
  }
  const exportAll = () => {
    const blob = new Blob([JSON.stringify(getDb(), null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `greenbook-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  }

  return (
    <main className="fade mx-auto min-h-dvh max-w-xl px-5 pb-28" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}>
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

      {!remote.ensayo && push && (
        <section className="mt-10 border-t border-rule pt-6">
          <h2 className="title">Avisos</h2>
          <p className="quiet mt-2 text-[16px]">{PUSH_LINES[push]}</p>
          {(push === 'on' || push === 'off') && (
            <button
              className={`btn mt-4 ${push === 'on' ? 'btn-line' : 'btn-primary'}`}
              onClick={() =>
                void (push === 'on' ? disablePush(remote) : enablePush(remote))
                  .then(setPush)
                  .catch(() => setPush('off'))
              }
            >
              {push === 'on' ? 'Dejar de avisarme aquí' : 'Avisarme en este móvil'}
            </button>
          )}
        </section>
      )}

      <section className="mt-10 border-t border-rule pt-6">
        <h2 className="title">Lo vuestro es vuestro</h2>
        <p className="quiet mt-2 text-[16px]">Una copia de todo lo que hay en este móvil: libros, veladas y papeles.</p>
        <button className="btn btn-line mt-4" onClick={exportAll}>
          Guardar una copia
        </button>
      </section>

      <section className="mt-10 border-t border-rule pt-6">
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
        <p className="quiet mt-8 text-[15px]">Greenbook · {__APP_VERSION__}</p>
      </section>
    </main>
  )
}
