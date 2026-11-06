import { Play, Square } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import type { ReadingWithBook } from '@/lib/types'
import { setReadingNow } from '@/lib/presence'
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
export function useActiveTimer(): TimerState | null {
  return useSyncExternalStore(
    subscribe,
    () => timer,
    () => null,
  )
}

export function startTimer(reading: ReadingWithBook): boolean {
  if (timer?.readingId === reading.id) return true
  if (timer && !window.confirm('Ya hay un cronómetro activo. ¿Quieres descartarlo y empezar este?')) return false
  setTimer({ readingId: reading.id, startedAt: Date.now() })
  void setReadingNow(reading.id)
  return true
}

export function stopTimer(): number {
  const minutes = timer ? Math.max(1, Math.ceil((Date.now() - timer.startedAt) / 60000)) : 1
  setTimer(null)
  void setReadingNow(null)
  return minutes
}

export function Timer({ reading }: { reading: ReadingWithBook }) {
  const active = useActiveTimer()
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
    if (startTimer(reading)) setNow(Date.now())
  }
  return (
    <>
      {running ? (
        <button className="btn btn-soft flex-1 whitespace-nowrap px-2 text-xs" onClick={() => setMinutes(stopTimer())}>
          <Square size={12} aria-hidden />
          <span role="timer" className="tabular-nums">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
          </span>
          Parar
        </button>
      ) : (
        <button className="btn btn-soft flex-1" onClick={start}>
          <Play size={14} fill="currentColor" aria-hidden />
          {reading.format === 'audio' ? 'Escuchar' : 'Leer'}
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
