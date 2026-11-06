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
      className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-[18px]"
      style={{ bottom: 'calc(96px + env(safe-area-inset-bottom))' }}
      aria-live="polite"
    >
      {list.map((t) => (
        <div
          key={t.id}
          className="w-full max-w-sm rounded-2xl bg-ink px-3.5 py-3 text-[13.5px] text-surface shadow-lg"
          style={{ animation: 'gb-fade-up 0.5s var(--spring)' }}
        >
          <p className="font-semibold">{t.message}</p>
          {t.detail && <p className="mt-0.5 break-words opacity-80">{t.detail}</p>}
        </div>
      ))}
    </div>
  )
}
