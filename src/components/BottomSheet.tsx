import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useNight } from './night'

interface Props {
  open: boolean
  onClose: () => void
  title?: ReactNode
  /** Accessible name for sheets without a visible title. */
  'aria-label'?: string
  /** Guard gesture, backdrop, Escape and close-button dismissal of unfinished drafts. */
  dirty?: boolean
  children: ReactNode
}

const EXIT_MS = 150
const layers: HTMLElement[] = []
const originalInert = new Map<HTMLElement, boolean>()
let originalOverflow = ''

function syncLayers() {
  const top = layers.at(-1)
  for (const child of Array.from(document.body.children)) {
    if (!(child instanceof HTMLElement)) continue
    if (!originalInert.has(child)) originalInert.set(child, child.inert)
    child.inert = top ? child !== top : (originalInert.get(child) ?? false)
  }
  if (!top) {
    for (const [element, inert] of originalInert) element.inert = inert
    originalInert.clear()
  }
}

/** Focus-contained modal sheet. Nested sheets leave only the top layer interactive. */
export function BottomSheet({ open, onClose, title, dirty = false, children, 'aria-label': label }: Props) {
  const night = useNight()
  const titleId = useId()
  const confirmId = useId()
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [drag, setDrag] = useState<number | null>(null)
  const layer = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const continueButton = useRef<HTMLButtonElement>(null)
  const start = useRef<{ y: number; t: number; pointer: number } | null>(null)
  const latest = useRef({ onClose, dirty, confirming })
  latest.current = { onClose, dirty, confirming }

  const requestClose = useCallback(() => {
    if (latest.current.dirty) setConfirming(true)
    else latest.current.onClose()
  }, [])

  useEffect(() => {
    let frame = 0
    if (open) {
      setMounted(true)
      setConfirming(false)
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setShown(true))
      })
      return () => cancelAnimationFrame(frame)
    }
    setShown(false)
    setDrag(null)
    start.current = null
    const id = setTimeout(() => setMounted(false), EXIT_MS)
    return () => clearTimeout(id)
  }, [open])

  useLayoutEffect(() => {
    if (!mounted || !layer.current) return
    const element = layer.current
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!layers.length) originalOverflow = document.body.style.overflow
    layers.push(element)
    document.body.style.overflow = 'hidden'
    syncLayers()
    closeButton.current?.focus({ preventScroll: true })
    const observer = new MutationObserver(syncLayers)
    observer.observe(document.body, { childList: true })
    const onKey = (event: KeyboardEvent) => {
      if (layers.at(-1) !== element) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (latest.current.confirming) {
          setConfirming(false)
          closeButton.current?.focus({ preventScroll: true })
        } else requestClose()
      }
      if (event.key !== 'Tab') return
      const controls = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((node) => !node.closest('[inert]') && !node.matches(':disabled') && node.getClientRects().length > 0)
      const first = controls[0]
      const last = controls.at(-1)
      if (!first) {
        event.preventDefault()
        panel.current?.focus()
      } else if (
        event.shiftKey &&
        (document.activeElement === first || !panel.current?.contains(document.activeElement))
      ) {
        event.preventDefault()
        last?.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !panel.current?.contains(document.activeElement))
      ) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      observer.disconnect()
      document.removeEventListener('keydown', onKey)
      const wasTop = layers.at(-1) === element
      layers.splice(layers.indexOf(element), 1)
      syncLayers()
      if (!layers.length) document.body.style.overflow = originalOverflow
      if (wasTop && trigger?.isConnected && !trigger.closest('[inert]')) trigger.focus({ preventScroll: true })
    }
  }, [mounted, requestClose])

  useEffect(() => {
    if (confirming) continueButton.current?.focus({ preventScroll: true })
    else closeButton.current?.focus({ preventScroll: true })
  }, [confirming])

  const cancelDrag = () => {
    start.current = null
    setDrag(null)
  }
  useEffect(() => {
    window.addEventListener('blur', cancelDrag)
    return () => window.removeEventListener('blur', cancelDrag)
  }, [])

  if (!mounted) return null

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (start.current || !event.isPrimary || event.button !== 0) return
    start.current = { y: event.clientY, t: performance.now(), pointer: event.pointerId }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (start.current?.pointer !== event.pointerId) return
    setDrag(Math.max(0, event.clientY - start.current.y))
  }
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (start.current?.pointer !== event.pointerId) return
    const dy = Math.max(0, event.clientY - start.current.y)
    const velocity = dy / Math.max(1, performance.now() - start.current.t)
    cancelDrag()
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    if (dy > 110 || velocity > 0.6) requestClose()
  }

  const translate = drag !== null ? `translateY(${drag}px)` : shown ? 'translateY(0)' : 'translateY(105%)'
  return createPortal(
    <div ref={layer} className={`fixed inset-0 z-50 flex flex-col justify-end ${night ? 'night bg-transparent' : ''}`}>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Cerrar ventana"
        className="absolute inset-0 bg-[var(--scrim)]"
        style={{ opacity: shown ? 1 : 0, transition: 'opacity 150ms var(--ease)' }}
        onClick={requestClose}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : (label ?? 'Opciones')}
        tabIndex={-1}
        className="relative mx-auto flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-[28px] bg-surface pb-safe shadow-[0_-12px_40px_-12px_rgb(0_0_0/0.35)]"
        style={{
          transform: translate,
          transition: drag !== null ? 'none' : `transform ${EXIT_MS}ms var(--ease)`,
        }}
      >
        <div
          className="mb-3 flex flex-none items-start gap-3 px-5 pt-2.5 pb-1"
          inert={confirming}
        >
          <div
            className="min-w-0 flex-1 cursor-grab touch-none select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={cancelDrag}
            onLostPointerCapture={cancelDrag}
            style={{ WebkitUserSelect: 'none' }}
          >
            <div className="mx-auto mb-2 h-[5px] w-10 rounded-full bg-rule" aria-hidden />
            {title && (
              <div id={titleId} className="wrap-anywhere pt-1 font-serif text-[23px] leading-tight">
                {title}
              </div>
            )}
          </div>
          <button
            ref={closeButton}
            type="button"
            className="icon-btn mt-3"
            aria-label="Cerrar"
            onClick={requestClose}
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        {confirming && (
          <div className="px-5 pb-5" role="alertdialog" aria-modal="true" aria-labelledby={confirmId}>
            <h2 id={confirmId} className="mb-4">
              ¿Descartar lo que has escrito?
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                ref={continueButton}
                type="button"
                className="btn btn-primary"
                onClick={() => setConfirming(false)}
              >
                Seguir escribiendo
              </button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Descartar
              </button>
            </div>
          </div>
        )}
        <div className="overflow-y-auto overscroll-contain px-5 pb-7" inert={confirming} hidden={confirming}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
