import { useEffect, useState } from 'react'
import { enablePush, getPushState, type PushState } from '@/lib/push'
import { toast } from '@/components/toast'

const messages: Record<PushState, string> = {
  enabled: 'En este iPhone: avisos activados',
  denied: 'En este iPhone: avisos no activados. Permítelos en Ajustes del iPhone.',
  'needs-install': 'En este iPhone: avisos no activados. Añade Greenbook a tu pantalla de inicio para recibirlos.',
  unsupported: 'En este dispositivo: avisos no disponibles. En iPhone necesitas iOS 16.4 o posterior.',
  default: 'En este iPhone: avisos no activados',
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
          Abre Greenbook en Safari, toca Compartir y elige «Añadir a pantalla de inicio». Después abre la app desde su
          icono.
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
