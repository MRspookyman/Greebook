import { useId, useRef, type ReactNode } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, startOfMonth } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { fmt, toISODate, todayISO } from '@/lib/dates'

interface Props {
  month: Date
  onMonthChange: (month: Date) => void
  renderDay: (iso: string) => ReactNode
  onDayClick: (iso: string) => void
}

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const WEEKDAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

/** Monday-first month calendar; day contents belong to the caller. */
export function MonthGrid({ month, onMonthChange, renderDay, onDayClick }: Props) {
  const headingId = useId()
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)
  const start = startOfMonth(month)
  const days = eachDayOfInterval({ start, end: endOfMonth(month) })
  const blanks = (start.getDay() + 6) % 7
  const today = todayISO()
  const move = (delta: number) => onMonthChange(addMonths(start, delta))

  return (
    <section aria-labelledby={headingId}>
      <header className="mb-1 flex items-center justify-between gap-2">
        <button className="btn btn-ghost min-h-11 min-w-11" onClick={() => move(-1)} aria-label="Mes anterior">
          <ChevronLeft size={22} />
        </button>
        <h2 id={headingId} className="text-center" aria-live="polite">
          {fmt(start, 'MMMM yyyy')}
        </h2>
        <button className="btn btn-ghost min-h-11 min-w-11" onClick={() => move(1)} aria-label="Mes siguiente">
          <ChevronRight size={22} />
        </button>
      </header>
      <div
        style={{ touchAction: 'pan-y' }}
        onTouchStart={(event) => {
          const touch = event.touches[0]
          swiped.current = false
          touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null
        }}
        onTouchEnd={(event) => {
          const first = touchStart.current
          const last = event.changedTouches[0]
          touchStart.current = null
          if (!first || !last) return
          const dx = last.clientX - first.x
          const dy = last.clientY - first.y
          if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            swiped.current = true
            move(dx < 0 ? 1 : -1)
          }
        }}
        onTouchCancel={() => {
          touchStart.current = null
        }}
        onClickCapture={(event) => {
          if (swiped.current) {
            event.preventDefault()
            event.stopPropagation()
            swiped.current = false
          }
        }}
      >
        <div className="mb-2 grid grid-cols-7 text-center text-xs text-muted">
          {WEEKDAYS.map((day, i) => (
            <span key={day} aria-label={WEEKDAY_NAMES[i]}>
              {day}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: blanks }, (_, i) => (
            <div key={`blank-${i}`} aria-hidden="true" />
          ))}
          {days.map((day) => {
            const iso = toISODate(day)
            return (
              <button
                key={iso}
                className="h-11 min-w-11 overflow-hidden rounded-xl text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                aria-label={fmt(day, "EEEE d 'de' MMMM 'de' yyyy")}
                aria-current={iso === today ? 'date' : undefined}
                onClick={() => onDayClick(iso)}
              >
                {renderDay(iso)}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
