import { useEffect, useRef, useState } from 'react'
import { shelfRows, spineOf } from '@/lib/shelf'
import type { Book } from '@/lib/types'
import { Spine } from './Book'

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

/** Spines standing on as many planks as they need. */
export function Shelf({ items, onOpen }: { items: ShelfItem[]; onOpen: (book: Book) => void }) {
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
