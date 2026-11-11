import { useSyncExternalStore } from 'react'

/** How the shelf is looked at: spines, as they stand, or covers facing out. Remembered on this phone. */
export type ShelfView = 'lomos' | 'portadas'

const KEY = 'gb.estanteria.vista'
const listeners = new Set<() => void>()

function read(): ShelfView {
  try {
    return localStorage.getItem(KEY) === 'portadas' ? 'portadas' : 'lomos'
  } catch {
    return 'lomos'
  }
}

export function setShelfView(view: ShelfView) {
  try {
    localStorage.setItem(KEY, view)
  } catch {
    // Without storage it just isn't remembered.
  }
  listeners.forEach((listener) => listener())
}

export function useShelfView(): ShelfView {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    read,
    () => 'lomos' as const,
  )
}
