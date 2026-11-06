import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
}

const EXIT_MS = 320

/**
 * Modal sheet that springs up from the bottom and slides back down on close.
 * Drag the handle/header down to dismiss. Children unmount after the exit animation.
 */
export function BottomSheet({ open, onClose, title, children }: Props) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const [drag, setDrag] = useState<number | null>(null)
  const start = useRef<{ y: number; t: number } | null>(null)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
      return () => cancelAnimationFrame(id)
    }
    setShown(false)
    const id = setTimeout(() => setMounted(false), EXIT_MS)
    return () => clearTimeout(id)
  }, [open])

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

  if (!mounted) return null

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    start.current = { y: e.clientY, t: performance.now() }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return
    setDrag(Math.max(0, e.clientY - start.current.y))
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return
    const dy = Math.max(0, e.clientY - start.current.y)
    const velocity = dy / Math.max(1, performance.now() - start.current.t)
    start.current = null
    setDrag(null)
    if (dy > 110 || velocity > 0.6) onClose()
  }

  const translate = drag !== null ? `translateY(${drag}px)` : shown ? 'translateY(0)' : 'translateY(105%)'
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/35"
        style={{ opacity: shown ? 1 : 0, transition: 'opacity 0.3s' }}
        onClick={onClose}
      />
      <div
        className="relative mx-auto flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-[28px] bg-surface pb-safe"
        style={{
          transform: translate,
          transition:
            drag !== null ? 'none' : `transform ${shown ? '0.55s var(--spring)' : `${EXIT_MS}ms var(--ease)`}`,
        }}
      >
        <div
          className="flex-none cursor-grab touch-none px-[18px] pt-2.5 pb-2"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="mx-auto mb-1 h-[5px] w-10 rounded bg-border" aria-hidden />
          {title && <div className="pt-1 font-serif text-xl font-semibold">{title}</div>}
        </div>
        <div className="overflow-y-auto px-[18px] pb-7">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
