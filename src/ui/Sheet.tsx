import { useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Close } from './icons'

interface Props {
  open: boolean
  onClose: () => void
  title?: ReactNode
  /** Accessible name for sheets without a visible title. */
  label?: string
  /** Always lamp-lit, like the reading screen it opens from. */
  night?: boolean
  children: ReactNode
}

const EXIT_MS = 180
const layers: HTMLElement[] = []
const wasInert = new Map<HTMLElement, boolean>()

/** Only the top sheet is interactive; everything else on the page goes inert. */
function syncLayers() {
  const top = layers.at(-1)
  for (const child of Array.from(document.body.children)) {
    if (!(child instanceof HTMLElement)) continue
    if (!wasInert.has(child)) wasInert.set(child, child.inert)
    child.inert = top ? child !== top : (wasInert.get(child) ?? false)
  }
  if (!top) wasInert.clear()
}

/** A sheet that rises from the bottom: focus stays inside, Escape and a downward drag close it. */
export function Sheet({ open, onClose, title, label, night = false, children }: Props) {
  const titleId = useId()
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)
  const [drag, setDrag] = useState<number | null>(null)
  const [viewport, setViewport] = useState<{ bottom: number; height: number } | null>(null)
  const layer = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const start = useRef<{ y: number; t: number; pointer: number } | null>(null)
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })
  // Mounts as soon as it opens and leaves the page only after sliding away.
  if (open && !mounted) setMounted(true)
  if (!open && entered) setEntered(false)
  const shown = open && entered

  useEffect(() => {
    if (open) {
      let frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setEntered(true))
      })
      return () => cancelAnimationFrame(frame)
    }
    const id = setTimeout(() => setMounted(false), EXIT_MS)
    return () => clearTimeout(id)
  }, [open])

  useLayoutEffect(() => {
    const element = layer.current
    if (!mounted || !element) return
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    layers.push(element)
    document.body.style.overflow = 'hidden'
    syncLayers()
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus({ preventScroll: true })
    const onKey = (event: KeyboardEvent) => {
      if (layers.at(-1) !== element) return
      if (event.key === 'Escape') {
        event.preventDefault()
        close.current()
      }
      if (event.key !== 'Tab') return
      const controls = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((node) => !node.matches(':disabled') && node.getClientRects().length > 0)
      const first = controls[0]
      const last = controls.at(-1)
      const inside = panel.current?.contains(document.activeElement)
      if (!first) event.preventDefault()
      else if (event.shiftKey && (document.activeElement === first || !inside)) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      layers.splice(layers.indexOf(element), 1)
      syncLayers()
      if (!layers.length) document.body.style.overflow = overflow
      if (trigger?.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [mounted])

  useLayoutEffect(() => {
    if (!mounted) return
    const visual = window.visualViewport
    const pending = { frame: 0 }
    const reveal = () => {
      cancelAnimationFrame(pending.frame)
      pending.frame = requestAnimationFrame(() => {
        const focused = document.activeElement
        if (focused instanceof HTMLElement && panel.current?.contains(focused) && focused.matches('input, textarea, select, [contenteditable="true"]')) {
          focused.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        }
      })
    }
    const update = () => {
      setViewport(visual ? {
        bottom: Math.max(0, window.innerHeight - visual.height - visual.offsetTop),
        height: visual.height,
      } : null)
      reveal()
    }
    update()
    visual?.addEventListener('resize', update)
    visual?.addEventListener('scroll', update)
    panel.current?.addEventListener('focusin', reveal)
    const element = panel.current
    return () => {
      cancelAnimationFrame(pending.frame)
      visual?.removeEventListener('resize', update)
      visual?.removeEventListener('scroll', update)
      element?.removeEventListener('focusin', reveal)
    }
  }, [mounted])

  if (!mounted) return null

  const endDrag = () => {
    start.current = null
    setDrag(null)
  }
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return
    start.current = { y: event.clientY, t: performance.now(), pointer: event.pointerId }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (start.current?.pointer === event.pointerId) setDrag(Math.max(0, event.clientY - start.current.y))
  }
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (start.current?.pointer !== event.pointerId) return
    const dy = Math.max(0, event.clientY - start.current.y)
    const velocity = dy / Math.max(1, performance.now() - start.current.t)
    endDrag()
    if (dy > 110 || velocity > 0.6) onClose()
  }

  return createPortal(
    <div ref={layer} className={`fixed inset-0 z-50 flex flex-col justify-end ${night ? 'night !bg-transparent' : ''}`}>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Cerrar"
        className="absolute inset-0 bg-[var(--scrim)]"
        style={{ opacity: shown ? 1 : 0, transition: `opacity ${EXIT_MS}ms var(--ease)` }}
        onClick={onClose}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : label}
        tabIndex={-1}
        className="relative mx-auto flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-[30px] bg-surface text-ink shadow-[0_-18px_50px_-18px_rgb(0_0_0/0.5)] outline-none"
        style={{
          bottom: viewport?.bottom ?? 0,
          maxHeight: viewport ? `${viewport.height * 0.92}px` : '92dvh',
          transform: drag !== null && open ? `translateY(${drag}px)` : shown ? 'none' : 'translateY(104%)',
          transition: drag !== null && open ? 'none' : `transform ${shown ? 320 : EXIT_MS}ms var(--ease)`,
        }}
      >
        <div className="flex flex-none items-start gap-2 pt-2 pr-3 pl-6">
          <div
            className="min-w-0 flex-1 cursor-grab touch-none select-none pb-2"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={endDrag}
          >
            <div className="mx-auto mb-3 h-[5px] w-10 rounded-full bg-rule" aria-hidden />
            {title && (
              <h2 id={titleId} className="title pt-1">
                {title}
              </h2>
            )}
          </div>
          <button type="button" className="icon-btn mt-3" aria-label="Cerrar" onClick={onClose}>
            <Close size={20} />
          </button>
        </div>
        <div
          className="overflow-y-auto overscroll-contain px-6 pt-2"
          style={{ paddingBottom: 'calc(28px + env(safe-area-inset-bottom))' }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
