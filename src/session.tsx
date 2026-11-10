import { createContext, useContext, useEffect, useState } from 'react'
import { onSignal, sendSignal, useDb } from '@/lib/sync/store'
import { toast } from '@/ui/toast'
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

/**
 * The «guiño»: while both candles burn, touching theirs makes your flame shiver on their screen and
 * their phone buzz. Nothing is stored. Returns a counter that changes with each one received, and how to send one.
 */
export function useWink(name: string | undefined): { received: number; send: () => void } {
  const [received, setReceived] = useState(0)
  useEffect(
    () =>
      onSignal((signal) => {
        if (signal !== 'guino') return
        setReceived((n) => n + 1)
        navigator.vibrate?.([120, 90, 220])
        toast(`${name ?? 'Tu pareja'} te manda un guiño`)
      }),
    [name],
  )
  return {
    received,
    send: () => {
      navigator.vibrate?.(15)
      sendSignal('guino')
      toast('Guiño enviado')
    },
  }
}
