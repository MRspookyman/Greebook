import { useSyncExternalStore } from 'react'

/**
 * Whether the evening draws its living wall (candlelight in signs, and the moths). Remembered on this phone:
 * it is a matter of taste and of battery, and both belong to the device.
 */
const KEY = 'gb.velada.pared'
const listeners = new Set<() => void>()

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'no'
  } catch {
    return true
  }
}

export function setLivingWall(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'si' : 'no')
  } catch {
    // Without storage it just isn't remembered.
  }
  listeners.forEach((listener) => listener())
}

export function useLivingWall(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    read,
    () => true,
  )
}
