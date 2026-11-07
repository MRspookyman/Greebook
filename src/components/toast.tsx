import { useSyncExternalStore } from 'react'

interface ToastAction {
  label: string
  run: () => void
}

interface ToastItem {
  id: number
  message: string
  detail?: string
  action?: ToastAction
}

let items: ToastItem[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id)
  emit()
}

/** Shows a transient message above the tab bar, optionally with one action (e.g. «Deshacer»). */
export function toast(message: string, detail?: string, action?: ToastAction) {
  const id = nextId++
  items = [...items, { id, message, detail, action }]
  emit()
  setTimeout(() => dismiss(id), action ? 7000 : 5000)
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
          className="wrap-anywhere pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[14px] border border-rule bg-surface px-4 py-3 text-sm text-ink shadow-[var(--paper-shadow)]"
          style={{ animation: 'gb-fade-up 150ms var(--ease)' }}
        >
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t.message}</p>
            {t.detail && <p className="mt-0.5 break-words text-muted">{t.detail}</p>}
          </div>
          {t.action && (
            <button
              type="button"
              className="btn btn-link -my-2 flex-none px-1 font-semibold"
              onClick={() => {
                dismiss(t.id)
                t.action?.run()
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
