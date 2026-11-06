import { createContext, useContext } from 'react'
import type { Profile } from '@/lib/types'

export interface Me {
  userId: string
  profile: Profile
  /** null only if pairing is missing in the DB. */
  partner: Profile | null
}

export const MeContext = createContext<Me | null>(null)

/** Logged-in user's profile and partner. Only usable below `AuthGate`. */
export function useMe(): Me {
  const me = useContext(MeContext)
  if (!me) throw new Error('useMe fuera de AuthGate')
  return me
}
