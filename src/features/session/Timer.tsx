import { useEffect, useState, useSyncExternalStore } from 'react'
import type { ReadingWithBook } from '@/lib/types'
import { setReadingNow } from '@/lib/presence'
import { elapsedMs, parseTimer, pauseTimerState, resumeTimerState, timerMinutes, type TimerState } from '@/lib/timer'

export type { TimerState }

const KEY = 'gb.timer'

function load(): TimerState | null {
  try {
    return parseTimer(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    /* An invalid stored timer is ignored. */
    return null
  }
}
let timer = load()
const listeners = new Set<() => void>()
function setTimer(value: TimerState | null) {
  if (value) localStorage.setItem(KEY, JSON.stringify(value))
  else localStorage.removeItem(KEY)
  timer = value
  listeners.forEach((fn) => fn())
}
function subscribe(fn: () => void) {
  listeners.add(fn)
  const storage = (event: StorageEvent) => {
    if (event.key === KEY) {
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

/** The running (or paused) reading timer, shared by every screen and tab. */
export function useActiveTimer(): TimerState | null {
  return useSyncExternalStore(
    subscribe,
    () => timer,
    () => null,
  )
}

/** Elapsed whole seconds, re-rendering on each second boundary while the timer runs. */
export function useElapsedSeconds(state: TimerState | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!state || state.pausedAt != null) return
    let id = 0
    const tick = () => {
      const current = Date.now()
      setNow(current)
      id = window.setTimeout(tick, 1000 - (elapsedMs(state, current) % 1000) + 8)
    }
    tick()
    return () => window.clearTimeout(id)
  }, [state])
  // A paused timer ignores `now`; a running one never reads before its own start.
  return state ? Math.floor(elapsedMs(state, Math.max(now, state.startedAt)) / 1000) : 0
}

/** Starts timing a reading; asks before replacing a timer that belongs to another book. */
export function startTimer(reading: ReadingWithBook, togetherId: string | null = null): boolean {
  if (timer?.readingId === reading.id) {
    if (timer.pausedAt != null) resumeTimer()
    if (togetherId && timer.togetherId !== togetherId) setTimer({ ...timer, togetherId })
    return true
  }
  if (timer && !window.confirm('Ya hay un cronómetro en marcha con otro libro. ¿Lo descartas y empiezas este?'))
    return false
  setTimer({ readingId: reading.id, startedAt: Date.now(), pausedAt: null, pausedMs: 0, togetherId })
  void setReadingNow(reading.id)
  return true
}

/** Links the running timer to a «lectura a la vez» (your partner joined you). */
export function attachTogether(togetherId: string): void {
  if (timer && timer.togetherId !== togetherId) setTimer({ ...timer, togetherId })
}

/** A paused timer is not «leyendo ahora»: your partner stops seeing the lamp until you resume. */
export function pauseTimer(): void {
  if (!timer || timer.pausedAt != null) return
  setTimer(pauseTimerState(timer, Date.now()))
  void setReadingNow(null)
}

export function resumeTimer(): void {
  if (!timer || timer.pausedAt == null) return
  setTimer(resumeTimerState(timer, Date.now()))
  void setReadingNow(timer.readingId)
}

/** Keeps the elapsed time but moves it to another book (started on the wrong one). */
export function transferTimer(readingId: string): void {
  if (!timer || timer.readingId === readingId) return
  setTimer({ ...timer, readingId, draft: null })
  if (timer.pausedAt == null) void setReadingNow(readingId)
}

/** Remembers the position chosen while timing, until the session is saved or discarded. */
export function setTimerDraft(readingId: string, value: number | null): void {
  if (timer?.readingId === readingId && timer.draft !== value) setTimer({ ...timer, draft: value })
}

/** Ends the timer and returns its minutes for the session being saved. */
export function stopTimer(): number {
  const minutes = timer ? timerMinutes(timer, Date.now()) : 1
  setTimer(null)
  void setReadingNow(null)
  return minutes
}

export function discardTimer(): void {
  setTimer(null)
  void setReadingNow(null)
}
