import { createContext, useContext, useEffect, useState } from 'react'
import { useDb } from '@/lib/sync/store'
import type { Remote } from '@/lib/sync/remote'
import type { Db, Profile } from '@/lib/types'

export interface SessionValue {
  remote: Remote
  userId: string
  signOut: () => Promise<void>
}

export const SessionContext = createContext<SessionValue | null>(null)

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession fuera de la sesión')
  return value
}

/** The local copy and the two of you. Only used below the gate that guarantees `me` exists. */
export function usePeople(): { db: Db; me: Profile; partner: Profile | null } {
  const { userId } = useSession()
  const db = useDb()
  const me = db.profiles[userId]
  return { db, me, partner: (me?.partner_id && db.profiles[me.partner_id]) || null }
}

/** The current time, refreshed while the screen is open: candles burn down and «hace 12 min» moves. */
export function useNow(everyMs = 20_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const id = setInterval(tick, everyMs)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [everyMs])
  return now
}
