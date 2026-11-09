import { useSyncExternalStore } from 'react'

export interface ToastAction {
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

export function dismissToast(id: number) {
  if (!items.some((t) => t.id === id)) return
  items = items.filter((t) => t.id !== id)
  emit()
}

/**
 * Shows a transient message above the tab bar. Callable from anywhere. With an action it shows a button
 * («Deshacer», «Actualizar»); `duration: null` keeps it until it is dismissed.
 */
export function toast(
  message: string,
  detail?: string,
  options: { action?: ToastAction; duration?: number | null } = {},
): number {
  const id = nextId++
  items = [...items, { id, message, detail, action: options.action }]
  emit()
  const duration = options.duration === undefined ? 5000 : options.duration
  if (duration !== null) setTimeout(() => dismissToast(id), duration)
  return id
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
      className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4"
      style={{ bottom: 'calc(var(--tabbar-h) + 26px + env(safe-area-inset-bottom))' }}
      aria-live="polite"
    >
      {list.map((t) => (
        <div
          key={t.id}
          className={`wrap-anywhere flex w-full max-w-sm items-center gap-3 rounded-[18px] bg-ink py-3 pr-2 pl-4 text-sm text-bg shadow-[0_14px_30px_-14px_rgb(0_0_0/0.5)] ${t.action ? 'pointer-events-auto' : 'pr-4'}`}
          style={{ animation: 'gb-fade-up 220ms var(--spring)' }}
        >
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">{t.message}</p>
            {t.detail && <p className="mt-0.5 break-words opacity-90">{t.detail}</p>}
          </div>
          {t.action && (
            <button
              type="button"
              className="min-h-11 flex-none rounded-full bg-bg px-4 font-extrabold text-ink transition-transform duration-150 active:scale-95"
              onClick={() => {
                dismissToast(t.id)
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
