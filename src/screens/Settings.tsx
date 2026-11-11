import { useEffect, useState } from 'react'
import { exportSheets } from '@/lib/export'
import { xlsx } from '@/lib/xlsx'
import { useBack } from '@/ui/useBack'
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
  const back = useBack()
  const [name, setName] = useState(me.name)
  const [leaving, setLeaving] = useState(false)
  const [push, setPush] = useState<PushState | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushError, setPushError] = useState('')
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
    const bytes = xlsx(exportSheets(getDb(), me.id))
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `greenbook-${new Date().toISOString().slice(0, 10)}.xlsx`
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  }

  return (
    <main className="fade mx-auto min-h-dvh max-w-xl px-5 pb-28" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}>
      <button className="icon-btn -ml-2" aria-label="Volver" onClick={back}>
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
            onBlur={() => {
              const trimmed = name.trim()
              setName(trimmed || me.name)
              if (trimmed && trimmed !== me.name) updateMe({ name: trimmed })
            }}
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
              disabled={pushBusy}
              aria-busy={pushBusy}
              onClick={() => {
                if (pushBusy) return
                setPushBusy(true)
                setPushError('')
                void (push === 'on' ? disablePush(remote) : enablePush(remote))
                  .then((next) => {
                    setPush(next)
                    if (push === 'off' && next === 'off') setPushError('No se han activado los avisos. Puedes volver a intentarlo.')
                  })
                  .catch(() => setPushError('No he podido cambiar los avisos. Revisa la conexión y prueba otra vez.'))
                  .finally(() => setPushBusy(false))
              }}
            >
              {pushBusy ? 'Un momento…' : push === 'on' ? 'Dejar de avisarme aquí' : 'Avisarme en este móvil'}
            </button>
          )}
          {pushError && <p role="status" className="quiet mt-3 text-[16px]">{pushError}</p>}
        </section>
      )}

      <section className="mt-10 border-t border-rule pt-6">
        <h2 className="title">Lo vuestro es vuestro</h2>
        <p className="quiet mt-2 text-[16px]">Un Excel con todo lo que hay en este móvil, en tres hojas: libros, veladas y notas.</p>
        <button className="btn btn-line mt-4" onClick={exportAll}>
          Descargar el Excel
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
              <button className="btn btn-soft" disabled={signingOut} onClick={() => setLeaving(false)}>
                Me quedo
              </button>
              <button
                className="btn btn-line btn-danger"
                disabled={signingOut}
                aria-busy={signingOut}
                onClick={() => {
                  if (signingOut) return
                  setSigningOut(true)
                  void signOut().finally(() => setSigningOut(false))
                }}
              >
                {signingOut ? 'Saliendo…' : 'Salir'}
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
