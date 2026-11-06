import { useEffect, useState, useSyncExternalStore } from 'react'
import type { ReadingWithBook } from '@/lib/types'
import { LogSessionSheet } from './LogSessionSheet'

type TimerState = { readingId: string; startedAt: number }
function load(): TimerState | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('gb.timer') ?? 'null')
    if (
      value &&
      typeof value === 'object' &&
      'readingId' in value &&
      typeof value.readingId === 'string' &&
      'startedAt' in value &&
      typeof value.startedAt === 'number' &&
      Number.isFinite(value.startedAt)
    )
      return value as TimerState
  } catch {
    /* An invalid stored timer is ignored. */
  }
  return null
}
let timer = load()
const listeners = new Set<() => void>()
function setTimer(value: TimerState | null) {
  if (value) localStorage.setItem('gb.timer', JSON.stringify(value))
  else localStorage.removeItem('gb.timer')
  timer = value
  listeners.forEach((fn) => fn())
}
function subscribe(fn: () => void) {
  listeners.add(fn)
  const storage = (event: StorageEvent) => {
    if (event.key === 'gb.timer') {
      timer = load()
      listeners.forEach((listener) => listener())
    }
  }
  window.addEventListener('storage', storage)
  return () => {
    listeners.delete(fn)
    window.removeEventListener('storage', storage)
  }
}
export function Timer({ reading }: { reading: ReadingWithBook }) {
  const active = useSyncExternalStore(
    subscribe,
    () => timer,
    () => null,
  )
  const [now, setNow] = useState(Date.now())
  const [minutes, setMinutes] = useState<number | null>(null)
  const running = active?.readingId === reading.id
  useEffect(() => {
    if (!running) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [running])
  const elapsed = running && active ? Math.max(0, Math.floor((now - active.startedAt) / 1000)) : 0
  function start() {
    if (active && !window.confirm('Ya hay un cronómetro activo. ¿Quieres descartarlo y empezar este?')) return
    const startedAt = Date.now()
    setNow(startedAt)
    setTimer({ readingId: reading.id, startedAt })
  }
  return (
    <>
      {running ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="stat-number tabular-nums" role="timer">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
          </span>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setMinutes(Math.max(1, Math.ceil((Date.now() - active.startedAt) / 60000)))
              setTimer(null)
            }}
          >
            Parar
          </button>
        </div>
      ) : (
        <button className="btn btn-secondary" onClick={start}>
          Empezar a leer
        </button>
      )}
      <LogSessionSheet
        open={minutes !== null}
        onClose={() => setMinutes(null)}
        reading={reading}
        initialMinutes={minutes ?? undefined}
      />
    </>
  )
}
