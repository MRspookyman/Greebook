import { createContext, useContext } from 'react'

/** True inside the lamp-lit reading screens, so sheets opened from them stay dark too. */
export const NightContext = createContext(false)

export function useNight(): boolean {
  return useContext(NightContext)
}
