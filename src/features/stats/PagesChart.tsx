import { useState } from 'react'
import { useEntered } from '@/components/motion'

export interface ChartPoint {
  key: string
  label: string
  fullLabel: string
  pages: number
}

export function PagesChart({ points }: { points: ChartPoint[] }) {
  const entered = useEntered()
  const [selected, setSelected] = useState<string | null>(null)
  const maximum = Math.max(1, ...points.map((point) => point.pages))
  const peak = points.find((point) => point.pages === maximum)?.key
  const selectedPoint = points.find((point) => point.key === selected)

  return (
    <div>
      <p className="mb-1 min-h-5 text-xs text-muted" role="status">
        {selectedPoint
          ? `${selectedPoint.fullLabel}: ${selectedPoint.pages.toLocaleString('es')} ${selectedPoint.pages === 1 ? 'página' : 'páginas'}`
          : maximum > 1 || points.some((point) => point.pages > 0)
            ? 'Toca una barra para ver las páginas'
            : 'Tus próximas páginas aparecerán aquí'}
      </p>
      <div className="overflow-x-auto pb-1">
        <div
          className="flex h-36 min-w-full items-end gap-1"
          role="group"
          aria-label="Páginas leídas. Desliza para ver todo el periodo"
        >
          {points.map((point) => (
            <button
              key={point.key}
              className="flex h-full min-w-11 flex-1 flex-col justify-end rounded-md focus-visible:outline-2 focus-visible:outline-accent"
              aria-label={`${point.fullLabel}: ${point.pages} ${point.pages === 1 ? 'página' : 'páginas'}`}
              aria-pressed={selected === point.key}
              onClick={() => setSelected(point.key)}
            >
              <span className="flex min-h-11 w-full flex-1 items-end">
                <span
                  className={`block w-full origin-bottom rounded-t-[5px] ${point.pages === 0 ? 'bg-border' : point.key === peak ? 'bg-amber' : 'bg-accent'}`}
                  style={{
                    height: `${Math.max(3, (point.pages / maximum) * 100)}%`,
                    transform: `scaleY(${entered ? 1 : 0})`,
                    opacity: selected && selected !== point.key ? 0.5 : 1,
                    transition: 'transform .5s var(--ease), opacity .2s var(--ease)',
                  }}
                />
              </span>
              <span className="mt-1 h-4 text-xs text-muted">{point.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
