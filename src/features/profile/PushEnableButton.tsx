import { useEffect, useState } from 'react'
import { enablePush, getPushState, type PushState } from '@/lib/push'
import { toast } from '@/components/toast'

const messages: Record<PushState, string> = {
  enabled: 'En este dispositivo: avisos activados',
  denied: 'En este dispositivo: avisos no activados. Permítelos en los ajustes del navegador o del dispositivo.',
  'needs-install': 'En este dispositivo: instala Greenbook y ábrelo desde su icono para activar los avisos.',
  unsupported: 'En este dispositivo: avisos no disponibles. En iPhone necesitas iOS 16.4 o posterior.',
  default: 'En este dispositivo: avisos no activados',
}

export function PushEnableButton() {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    const refresh = () => {
      void getPushState()
        .then((next) => {
          if (active) setState(next)
        })
        .catch(() => {
          if (active) setState('default')
        })
    }
    refresh()
    window.addEventListener('focus', refresh)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
    }
  }, [])

  async function activate() {
    setBusy(true)
    try {
      setState(await enablePush())
    } catch (error) {
      toast('No se pudieron activar los avisos', error instanceof Error ? error.message : 'Inténtalo de nuevo')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted" role="status">
        {state ? messages[state] : 'Consultando avisos…'}
      </p>
      {state === 'needs-install' && (
        <p className="text-sm text-muted">
          En Android, abre Greenbook en Chrome y elige «Instalar app» (no un acceso directo).
          En iPhone, ábrelo en Safari, toca Compartir y elige «Añadir a pantalla de inicio».
          Después abre la app desde su icono.
        </p>
      )}
      {state === 'default' && (
        <button
          type="button"
          className="btn btn-outline w-full"
          disabled={busy}
          onClick={() => {
            void activate()
          }}
        >
          {busy ? 'Activando…' : 'Activar avisos en este dispositivo'}
        </button>
      )}
    </div>
  )
}
