import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMe } from '@/features/auth/me'
import { qk } from '@/lib/data'
import { supabase } from '@/lib/supabase'

const TABLES = [
  'sessions',
  'readings',
  'reactions',
  'notes',
  'recommendations',
  'nudges',
  'challenges',
  'profiles',
] as const

export function useRealtimeSync(): void {
  const { userId, partner } = useMe()
  const qc = useQueryClient()
  const partnerId = partner?.id
  useEffect(() => {
    const ids = partnerId ? [userId, partnerId] : [userId]
    const channel = supabase.channel(`couple:${userId}`)
    for (const table of TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as {
          id?: string
          user_id?: string
          reading_id?: string
          month?: string
        }
        switch (table) {
          case 'reactions':
            void qc.invalidateQueries({ queryKey: qk.reactions() })
            return
          case 'notes':
            void qc.invalidateQueries({ queryKey: qk.sharedNotes() })
            if (row.reading_id) void qc.invalidateQueries({ queryKey: qk.notes(row.reading_id) })
            return
          case 'recommendations':
            void qc.invalidateQueries({ queryKey: qk.recommendations() })
            return
          case 'nudges':
            void qc.invalidateQueries({ queryKey: qk.nudges() })
            return
          case 'challenges':
            void qc.invalidateQueries({ queryKey: ['challenge'] })
            return
          case 'profiles':
            if (row.id) void qc.invalidateQueries({ queryKey: qk.profile(row.id) })
            return
        }
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
