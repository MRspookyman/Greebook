import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
}

/** Modal sheet sliding from the bottom. Unmounts its children while closed. */
export function BottomSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/40"
        style={{ animation: 'gb-fade-in 150ms ease-out' }}
        onClick={onClose}
      />
      <div
        className="relative bg-surface rounded-t-[20px] max-h-[92dvh] overflow-y-auto pb-safe w-full max-w-xl mx-auto"
        style={{ animation: 'gb-sheet-in 150ms ease-out' }}
      >
        <div className="sticky top-0 bg-surface z-10 flex items-center justify-between px-5 pt-3 pb-2">
          <div className="font-serif font-semibold text-xl">{title}</div>
          <button
            className="min-w-11 min-h-11 flex items-center justify-center -mr-2 text-muted"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={22} />
          </button>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
