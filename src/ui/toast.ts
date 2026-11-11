export interface Item {
  id: number
  message: string
  action?: { label: string; run: () => void }
  sticky: boolean
}

let items: Item[] = []
let nextId = 1
export const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

export function dismiss(id: number) {
  items = items.filter((item) => item.id !== id)
  emit()
}

/**
 * A brief line at the bottom of the screen. With an action it stays a little longer; `sticky` keeps it
 * until it is answered (a new version waiting).
 */
export function toast(message: string, action?: Item['action'], sticky = false) {
  const id = nextId++
  const transient = items.filter((item) => !item.sticky).slice(sticky ? -3 : -2)
  items = [...items.filter((item) => item.sticky || transient.includes(item)), { id, message, action, sticky }]
  emit()
  if (!sticky) setTimeout(() => dismiss(id), action ? 6500 : 4200)
}

export const getItems = () => items
