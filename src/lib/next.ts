import { useSyncExternalStore } from 'react'

/**
 * «El siguiente»: the book of the pile you mean to read next. It is a note to yourself, kept on this
 * phone only: it does not travel to the server nor to the other one of you.
 */
const key = (userId: string) => `gb.siguiente.${userId}`
const listeners = new Set<() => void>()

function read(userId: string): string | null {
  try {
    return localStorage.getItem(key(userId))
  } catch {
    return null
  }
}

export function setNextUp(userId: string, bookId: string | null) {
  try {
    if (bookId) localStorage.setItem(key(userId), bookId)
    else localStorage.removeItem(key(userId))
  } catch {
    // Without storage there is simply no «siguiente».
  }
  listeners.forEach((listener) => listener())
}

export function useNextUp(userId: string): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => read(userId),
    () => null,
  )
}
