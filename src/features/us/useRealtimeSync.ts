import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMe } from '@/features/auth/me'
import { qk } from '@/lib/data'
import { supabase } from '@/lib/supabase'

const TABLES = [
  'message_pings',
  'invites',
  'together_items',
  'couple_goals',
  'reactions',
  'readings',
  'sessions',
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
          month?: string
        }
        if (table === 'message_pings' || table === 'readings') {
          void qc.invalidateQueries({ queryKey: qk.messages() })
        }
        switch (table) {
          case 'message_pings':
            return
          case 'invites':
            void qc.invalidateQueries({ queryKey: qk.invites() })
            return
          case 'together_items':
            void qc.invalidateQueries({ queryKey: qk.together() })
            return
          case 'couple_goals':
            void qc.invalidateQueries({ queryKey: row.month ? qk.coupleGoal(row.month) : ['couple-goal'] })
            return
          case 'reactions':
            void qc.invalidateQueries({ queryKey: qk.reactions() })
            return
          case 'profiles':
            for (const id of row.id ? [row.id] : ids) void qc.invalidateQueries({ queryKey: qk.profile(id) })
            return
        }
        for (const id of row.user_id ? [row.user_id] : ids) {
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
