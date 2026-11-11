import { useSyncExternalStore } from 'react'
import { useLocation } from 'react-router'
import { dismiss, getItems, listeners } from './toast'

/** Where the brief lines from `toast()` are shown. */
export function Toaster() {
  const { pathname } = useLocation()
  return <ToastList atTop={pathname === '/velada'} />
}

function ToastList({ atTop = false }: { atTop?: boolean }) {
  const list = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getItems,
  )
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4"
      style={atTop ? { top: 'calc(12px + env(safe-area-inset-top))' } : { bottom: 'calc(84px + env(safe-area-inset-bottom))' }}
      aria-live="polite"
    >
      {list.map((item) => (
        <div
          key={item.id}
          className="rise pointer-events-auto flex max-w-sm items-center gap-3 rounded-full bg-ink py-2 pr-2 pl-5 text-[16px] text-bg shadow-[var(--lift)]"
        >
          <span className="py-1.5 pr-3">{item.message}</span>
          {item.action && (
            <button
              type="button"
              className="min-h-10 flex-none rounded-full bg-bg px-4 font-medium text-ink"
              onClick={() => {
                dismiss(item.id)
                item.action?.run()
              }}
            >
              {item.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
