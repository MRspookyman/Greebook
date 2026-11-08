/**
 * Reading timer state kept in localStorage. Pauses are stored as an accumulated offset so
 * the elapsed time survives reloads and works across tabs without a ticking source of truth.
 */
export interface TimerState {
  readingId: string
  startedAt: number
  /** Epoch ms when the current pause began; null/absent while running. */
  pausedAt?: number | null
  /** Total ms spent in earlier pauses. */
  pausedMs?: number
  /** Position set on the reading screen before saving, so leaving and coming back keeps it. */
  draft?: number | null
  /** The «lectura a la vez» this timer belongs to, once one of you joined the other. */
  togetherId?: string | null
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/** Validates a stored timer; anything malformed is ignored. */
export function parseTimer(value: unknown): TimerState | null {
  if (!value || typeof value !== 'object') return null
  const t = value as Record<string, unknown>
  if (typeof t.readingId !== 'string' || !finite(t.startedAt)) return null
  if (t.pausedAt != null && !finite(t.pausedAt)) return null
  if (t.pausedMs != null && (!finite(t.pausedMs) || t.pausedMs < 0)) return null
  return {
    readingId: t.readingId,
    startedAt: t.startedAt,
    pausedAt: (t.pausedAt as number | null | undefined) ?? null,
    pausedMs: (t.pausedMs as number | undefined) ?? 0,
    draft: Number.isSafeInteger(t.draft) ? (t.draft as number) : null,
    togetherId: typeof t.togetherId === 'string' ? t.togetherId : null,
  }
}

export function isPaused(t: TimerState): boolean {
  return t.pausedAt != null
}

export function elapsedMs(t: TimerState, now: number): number {
  return Math.max(0, (t.pausedAt ?? now) - t.startedAt - (t.pausedMs ?? 0))
}

/** Whole minutes for the session (rounded, at least 1). */
export function timerMinutes(t: TimerState, now: number): number {
  return Math.max(1, Math.round(elapsedMs(t, now) / 60000))
}

export function pauseTimerState(t: TimerState, now: number): TimerState {
  return isPaused(t) ? t : { ...t, pausedAt: now }
}

export function resumeTimerState(t: TimerState, now: number): TimerState {
  if (t.pausedAt == null) return t
  return { ...t, pausedAt: null, pausedMs: (t.pausedMs ?? 0) + Math.max(0, now - t.pausedAt) }
}

/** "04:07", "59:59", "1:02:03". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${String(m).padStart(2, '0')}:${sec}`
}

/** Spoken version for assistive technology: "24 min 7 s". */
export function spokenClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return [h ? `${h} h` : '', m ? `${m} min` : '', `${s % 60} s`].filter(Boolean).join(' ')
}
