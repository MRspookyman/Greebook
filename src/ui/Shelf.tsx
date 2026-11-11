import { useEffect, useRef, useState } from 'react'
import { shelfRows, spineOf } from '@/lib/shelf'
import type { Book } from '@/lib/types'
import { Cover, Spine } from './Book'

export interface ShelfItem {
  book: Book
  /** Wax colours of who has read it. */
  ribbons: string[]
}

export function Plank() {
  return (
    <div
      aria-hidden
      className="h-[11px] rounded-[2px]"
      style={{
        background: 'linear-gradient(var(--wood), var(--wood-edge))',
        boxShadow: '0 10px 14px -8px rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.18)',
      }}
    />
  )
}

const GAP = 3
const INSET = 12

const COVER_GAP = 14

interface ShelfProps {
  items: ShelfItem[]
  onOpen: (book: Book) => void
  /** Spines, as books stand on a shelf, or covers facing out. */
  view?: 'lomos' | 'portadas'
}

/** Books standing on as many planks as they need: by their spines, or showing their covers. */
export function Shelf({ items, onOpen, view = 'lomos' }: ShelfProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const plank = width - INSET * 2
  if (view === 'portadas') {
    // As many covers per plank as fit at a comfortable size; never fewer than two.
    const perRow = Math.max(2, Math.floor((plank + COVER_GAP) / (92 + COVER_GAP)))
    const size = Math.min(128, Math.floor((plank - COVER_GAP * (perRow - 1)) / perRow))
    const rows: ShelfItem[][] = []
    if (width) for (let i = 0; i < items.length; i += perRow) rows.push(items.slice(i, i + perRow))
    return (
      <div ref={ref} className="flex flex-col gap-6">
        {rows.map((row, r) => (
          <div key={r}>
            <div className="flex items-end pt-4" style={{ gap: COVER_GAP, paddingInline: INSET }}>
              {row.map((item) => (
                <button
                  key={item.book.id}
                  type="button"
                  onClick={() => onOpen(item.book)}
                  aria-label={`${item.book.title}${item.book.author ? `, de ${item.book.author}` : ''}`}
                  className="relative flex-none origin-bottom transition-transform duration-200 ease-out hover:-translate-y-1.5 active:-translate-y-2"
                >
                  {item.ribbons.map((color, i) => (
                    <span
                      key={color + i}
                      aria-hidden
                      className="absolute -top-[9px] z-10 h-[21px] w-[9px] rounded-t-[1.5px]"
                      style={{
                        left: 8 + i * 11,
                        background: color,
                        boxShadow: '0 1px 2px rgb(0 0 0 / 0.4)',
                        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)',
                      }}
                    />
                  ))}
                  <Cover book={item.book} width={size} />
                </button>
              ))}
            </div>
            <Plank />
          </div>
        ))}
      </div>
    )
  }

  const rows = width ? shelfRows(items.map((item) => ({ ...item, width: spineOf(item.book).width })), plank, GAP) : []
  return (
    <div ref={ref} className="flex flex-col gap-5">
      {rows.map((row, r) => {
        const used = row.reduce((sum, item) => sum + item.width + GAP, 0)
        // With room to spare, the last book of the shelf leans on its neighbours, as they do.
        const leans = r === rows.length - 1 && row.length > 2 && plank - used > 34
        return (
          <div key={r}>
            <div className="flex items-end pt-3" style={{ gap: GAP, paddingInline: INSET }}>
              {row.map((item, i) => (
                <Spine
                  key={item.book.id}
                  book={item.book}
                  ribbons={item.ribbons}
                  onClick={() => onOpen(item.book)}
                  style={
                    leans && i === row.length - 1
                      ? { rotate: '-6deg', transformOrigin: 'bottom left', marginLeft: 9 }
                      : undefined
                  }
                />
              ))}
            </div>
            <Plank />
          </div>
        )
      })}
    </div>
  )
}
