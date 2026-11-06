import { useState } from 'react'
import { useMe } from '@/features/auth/me'
import { exportGreenbook } from '@/lib/export'
import { toast } from '@/components/toast'

export function DataSection() {
  const { userId } = useMe()
  const [busy, setBusy] = useState(false)
  async function exportData() {
    setBusy(true)
    try {
      await exportGreenbook(userId)
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        toast('No se pudieron exportar tus datos', 'Comprueba la conexión e inténtalo de nuevo.')
      }
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="card space-y-3 p-5" aria-labelledby="data-title">
      <h2 id="data-title">Datos</h2>
      <p className="text-muted">
        Guarda tu diario completo en JSON y tus lecturas en CSV, compatible con Excel. Solo se incluyen tus datos y tus
        notas.
      </p>
      <button type="button" className="btn btn-secondary" disabled={busy} onClick={exportData}>
        {busy ? 'Preparando archivos…' : 'Exportar'}
      </button>
    </section>
  )
}
