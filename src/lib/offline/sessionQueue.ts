import { useEffect, useSyncExternalStore } from 'react'
import { liveQuery } from 'dexie'
import { offlineDb, type PendingSession } from './db'
import { queryClient } from '@/lib/queryClient'
import { qk } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import type { ReadingWithBook, Session } from '@/lib/types'
import { toast } from '@/components/toast'

function apply(op: PendingSession) {
  const { session, readingPatch } = op.payload
  queryClient.setQueryData<Session[]>(qk.sessions(session.user_id), (old = []) =>
    old.some((s) => s.id === session.id) ? old : [session, ...old],
  )
  queryClient.setQueryData<ReadingWithBook[]>(qk.readings(session.user_id), (old) =>
    old?.map((r) => (r.id === session.reading_id ? { ...r, ...readingPatch } : r)),
  )
}
async function refresh(userId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.sessions(userId) }),
    queryClient.invalidateQueries({ queryKey: qk.readings(userId) }),
  ])
  for (const op of await offlineDb.pendingOps.orderBy('createdAt').toArray()) {
    if (op.payload.session.user_id === userId) apply(op)
  }
}
let flight: Promise<void> | null = null
let requested = false
/** Drain durable operations in creation order; all callers share one in-flight drain. */
export function flush(): Promise<void> {
  requested = true
  if (flight) return flight
  flight = (async () => {
    do {
      requested = false
      if (!navigator.onLine) return
      const {
        data: { session: auth },
      } = await supabase.auth.getSession()
      if (!auth) return
      const ops = await offlineDb.pendingOps.orderBy('createdAt').toArray()
      for (const op of ops) {
        const { session, readingPatch } = op.payload
        if (session.user_id !== auth.user.id) continue
        try {
          const inserted = await supabase.from('sessions').upsert(session, { onConflict: 'id' })
          let error = inserted.error
          let status = inserted.status
          if (!error) {
            const updated = await supabase
              .from('readings')
              .update(readingPatch)
              .eq('id', session.reading_id)
              .eq('user_id', session.user_id)
            error = updated.error
            status = updated.status
          }
          if (error) {
            // Network failures (status 0) and expired auth (401) are retried later; other errors are permanent.
            if (
              status === 401 ||
              (!(status >= 400 && status < 500) &&
                !error.code?.startsWith('PGRST') &&
                !/^\d{5}$/.test(error.code ?? ''))
            )
              return
            await offlineDb.pendingOps.delete(op.id)
            toast('No se pudo guardar una sesión', error.message)
            await refresh(session.user_id)
            continue
          }
          await offlineDb.pendingOps.delete(op.id)
          await refresh(session.user_id)
        } catch {
          return
        }
      }
    } while (requested)
  })().finally(() => {
    flight = null
  })
  return flight
}
/**
 * Persist before touching the UI. The UUID is reused by every retry so an
 * interrupted session upsert cannot create duplicate reading sessions.
 */
export async function logSession(input: {
  reading: ReadingWithBook
  readOn: string
  endPos: number
  minutes: number | null
}): Promise<void> {
  const cached = queryClient.getQueryData<ReadingWithBook[]>(qk.readings(input.reading.user_id))
  const reading = cached?.find((r) => r.id === input.reading.id) ?? input.reading
  if (input.endPos <= reading.current_position || input.endPos > reading.total_units)
    throw new Error('El progreso ha cambiado. Revisa la posición e inténtalo de nuevo.')
  await queryClient.cancelQueries({ queryKey: qk.readings(reading.user_id) })
  await queryClient.cancelQueries({ queryKey: qk.sessions(reading.user_id) })
  const id = crypto.randomUUID()
  const op: PendingSession = {
    id,
    kind: 'session',
    createdAt: Date.now(),
    payload: {
      session: {
        id,
        reading_id: reading.id,
        user_id: reading.user_id,
        read_on: input.readOn,
        start_pos: reading.current_position,
        end_pos: input.endPos,
        minutes: input.minutes,
        created_at: new Date().toISOString(),
      },
      readingPatch: {
        current_position: input.endPos,
        ...(reading.status === 'want' ? { status: 'reading' as const, started_on: input.readOn } : {}),
        ...(reading.started_on && input.readOn < reading.started_on ? { started_on: input.readOn } : {}),
      },
    },
  }
  await offlineDb.pendingOps.add(op)
  apply(op)
  void flush()
}
export function useOfflineSync(): void {
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState !== 'hidden') void flush()
    }
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session)
        for (const op of await offlineDb.pendingOps.orderBy('createdAt').toArray()) {
          if (op.payload.session.user_id === session.user.id) apply(op)
        }
      sync()
    })()
    window.addEventListener('online', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      window.removeEventListener('online', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])
}
export function usePendingSessionCount(): number {
  return useSyncExternalStore(
    subscribeCount,
    () => count,
    () => 0,
  )
}
let count = 0
const listeners = new Set<() => void>()
let stop: (() => void) | undefined
function subscribeCount(listener: () => void) {
  listeners.add(listener)
  if (!stop) {
    const subscription = liveQuery(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const ops = await offlineDb.pendingOps.toArray()
      return ops.filter((op) => op.payload.session.user_id === session?.user.id).length
    }).subscribe((value) => {
      count = value
      listeners.forEach((fn) => fn())
    })
    stop = () => subscription.unsubscribe()
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      stop?.()
      stop = undefined
    }
  }
}
