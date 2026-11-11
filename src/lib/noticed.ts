import { useMemo, useSyncExternalStore } from 'react'

/**
 * Notes whose notice on the first screen I have already tapped. The notice is said once: after that the note
 * simply lives in its book. Kept on this phone only; whether a note has been *read* is another matter, and
 * that one does travel (`seen_at`).
 */
const key = (userId: string) => `gb.avisadas.${userId}`
const listeners = new Set<() => void>()

function read(userId: string): string {
  try {
    return localStorage.getItem(key(userId)) ?? '[]'
  } catch {
    return '[]'
  }
}

export function markNoticed(userId: string, slipIds: string[]) {
  try {
    const known = new Set<string>(JSON.parse(read(userId)) as string[])
    slipIds.forEach((id) => known.add(id))
    // Old ones fall off: a notice can only come back for a note that is still unread anyway.
    localStorage.setItem(key(userId), JSON.stringify([...known].slice(-500)))
  } catch {
    // Without storage the notice just shows again.
  }
  listeners.forEach((listener) => listener())
}

export function useNoticed(userId: string): ReadonlySet<string> {
  const stored = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => read(userId),
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
