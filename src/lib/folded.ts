import { useMemo, useSyncExternalStore } from 'react'

/** Which parts of the nightstand and the shelf are folded away. Remembered on this phone. */
const KEY = 'gb.plegado'
const listeners = new Set<() => void>()

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? '[]'
  } catch {
    return '[]'
  }
}

export function toggleFolded(id: string) {
  try {
    const folded = new Set<string>(JSON.parse(read()) as string[])
    if (!folded.delete(id)) folded.add(id)
    localStorage.setItem(KEY, JSON.stringify([...folded]))
  } catch {
    // Without storage nothing stays folded.
  }
  listeners.forEach((listener) => listener())
}

export function useFolded(): ReadonlySet<string> {
  const stored = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    read,
    () => '[]',
  )
  return useMemo(() => {
    try {
      return new Set(JSON.parse(stored) as string[])
    } catch {
      return new Set<string>()
    }
  }, [stored])
}
