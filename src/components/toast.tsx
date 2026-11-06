import { useSyncExternalStore } from 'react'

interface ToastItem {
  id: number
  message: string
  detail?: string
}

let items: ToastItem[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Shows a transient message at the top of the screen. Callable from anywhere. */
export function toast(message: string, detail?: string) {
  const id = nextId++
  items = [...items, { id, message, detail }]
  emit()
  setTimeout(() => {
    items = items.filter((t) => t.id !== id)
    emit()
  }, 5000)
}

export function Toaster() {
  const list = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => items,
  )
  return (
    <div
      className="fixed top-0 inset-x-0 z-[60] flex flex-col items-center gap-2 p-3 pt-safe pointer-events-none"
      aria-live="polite"
    >
      {list.map((t) => (
        <div
          key={t.id}
          className="card px-4 py-3 shadow-lg max-w-sm w-full"
          style={{ animation: 'gb-fade-up 150ms ease-out' }}
        >
          <p className="font-medium">{t.message}</p>
          {t.detail && <p className="text-sm text-muted mt-0.5 break-words">{t.detail}</p>}
        </div>
      ))}
    </div>
  )
}
