import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMe } from '@/features/auth/me'
import { qk } from '@/lib/data'
import { supabase } from '@/lib/supabase'

export function useRealtimeSync(): void {
  const { userId, partner } = useMe()
  const qc = useQueryClient()
  const partnerId = partner?.id
  useEffect(() => {
    const ids = partnerId ? [userId, partnerId] : [userId]
    const channel = supabase.channel(`couple:${userId}`)
    for (const table of ['sessions', 'readings', 'reactions'] as const) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        if (table === 'reactions') {
          void qc.invalidateQueries({ queryKey: qk.reactions() })
          return
        }
        const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as { user_id?: string }
        const affected = row.user_id ? [row.user_id] : ids
        for (const id of affected) {
          void qc.invalidateQueries({ queryKey: table === 'sessions' ? qk.sessions(id) : qk.readings(id) })
        }
      })
    }
    channel.subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, partnerId, qc])
}
