import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Hand } from 'lucide-react'
import { BottomSheet } from '@/components/BottomSheet'
import { toast } from '@/components/toast'
import { NUDGES } from '@/config/nudges'
import { useMe } from '@/features/auth/me'
import { qk, useNudges } from '@/lib/data'
import { todayISO } from '@/lib/dates'
import { supabase } from '@/lib/supabase'

/** Whether I already nudged my partner today (one per day). */
export function useNudgedToday(): boolean {
  const { userId } = useMe()
  const nudges = useNudges()
  const today = todayISO()
  return !!nudges.data?.some((nudge) => nudge.from_user === userId && nudge.sent_on === today)
}

export function NudgeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { userId, partner } = useMe()
  const qc = useQueryClient()
  const sent = useNudgedToday()
  const [message, setMessage] = useState<string>(NUDGES[0])
  const [busy, setBusy] = useState(false)
  if (!partner) return null
  async function send() {
    if (busy || sent) return
    setBusy(true)
    try {
      const { error } = await supabase
        .from('nudges')
        .insert({ from_user: userId, to_user: partner!.id, message, sent_on: todayISO() })
      if (error) throw error
      await qc.invalidateQueries({ queryKey: qk.nudges() })
      toast('Toque enviado', 'El siguiente, mañana.')
      onClose()
    } catch (error) {
      const duplicate = (error as { code?: string }).code === '23505'
      toast(duplicate ? 'Ya le has dado un toque hoy' : 'No se pudo enviar el toque')
    } finally {
      setBusy(false)
    }
  }
  return (
    <BottomSheet open={open} onClose={onClose} title={`Dar un toque a ${partner.display_name}`}>
      <div className="space-y-4">
        <p className="text-sm text-muted">Le llega como aviso. Puedes mandar uno al día.</p>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Mensaje">
          {NUDGES.map((text) => (
            <button
              key={text}
              type="button"
              role="radio"
              aria-checked={message === text}
              className="chip min-h-12 justify-start text-left"
              aria-pressed={message === text}
              onClick={() => setMessage(text)}
            >
              {text}
            </button>
          ))}
        </div>
        <button
          className="btn w-full text-surface"
          style={{ background: `var(--${partner.accent})` }}
          disabled={busy || sent}
          onClick={() => void send()}
        >
          <Hand size={18} />
          {sent ? 'Ya le has dado un toque hoy' : busy ? 'Enviando…' : 'Enviar toque'}
        </button>
      </div>
    </BottomSheet>
  )
}
