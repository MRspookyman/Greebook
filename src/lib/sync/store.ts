import { useSyncExternalStore } from 'react'
import { del, get, set } from 'idb-keyval'
import { emptyDb, type Db, type Row, type Table } from '../types'
import { advance, keyOf, mergePull, uploadOrder, type Cursors } from './merge'
import { RemoteError, type Channel, type Notice, type Remote, type Signal } from './remote'

/**
 * The local copy. The interface only ever reads and writes here, instantly; the server is told later.
 *
 * - Every write replaces the row locally and marks it «dirty».
 * - `sync()` uploads dirty rows (ids are born on the phone and everything is an upsert, so retrying is
 *   harmless), then pulls what changed and folds it in without touching rows still waiting to go up.
 * - The whole thing is one object in IndexedDB per person: for two readers it stays tiny.
 */

/** Something to tell the server that isn't a row: opening a slip, or a notice for the partner. */
export type Call =
  | { id: string; kind: 'open'; slip: string; loved: boolean | null }
  | { id: string; kind: 'notify'; what: Notice; ref: string }

interface Local {
  v: 1
  db: Db
  dirty: string[]
  calls: Call[]
  cursors: Cursors
}

export interface SyncStatus {
  /** Changes made here that the server doesn't have yet. */
  pending: number
  /** The last attempt could not reach the server. */
  offline: boolean
}

const fresh = (): Local => ({ v: 1, db: emptyDb(), dirty: [], calls: [], cursors: {} })
const storageKey = (userId: string) => `gb:${userId}`

let remote: Remote | null = null
let me = ''
let local = fresh()
let status: SyncStatus = { pending: 0, offline: false }
let channel: Channel | null = null
let channelWith = ''
let problem: ((message: string) => void) | null = null

const listeners = new Set<() => void>()
const signalListeners = new Set<(signal: Signal) => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit() {
  // Notices for the partner are not changes of yours: they don't count as something waiting.
  const pending = local.dirty.length + local.calls.filter((call) => call.kind === 'open').length
  if (pending !== status.pending) status = { ...status, pending }
  listeners.forEach((listener) => listener())
}

// ── Persistence ──

let saveTimer: ReturnType<typeof setTimeout> | undefined
function saveNow() {
  clearTimeout(saveTimer)
  saveTimer = undefined
  if (me) void set(storageKey(me), local).catch(() => {})
}
function saveSoon() {
  saveTimer ??= setTimeout(saveNow, 200)
}

// ── Reading ──

export const getDb = () => local.db
export const getMe = () => me

/** The whole local copy; it is replaced (never mutated) on every change. */
export function useDb(): Db {
  return useSyncExternalStore(subscribe, getDb)
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribe, () => status)
}

/** Live signals from the partner («guiño»). */
export function onSignal(listener: (signal: Signal) => void): () => void {
  signalListeners.add(listener)
  return () => signalListeners.delete(listener)
}

export function sendSignal(signal: Signal) {
  channel?.send(signal)
}

// ── Writing ──

/** Saves a row here and queues it for the server. */
export function save<T extends Table>(table: T, row: Row<T>) {
  const key = keyOf(table, row.id)
  local = {
    ...local,
    db: { ...local.db, [table]: { ...local.db[table], [row.id]: row } },
    dirty: local.dirty.includes(key) ? local.dirty : [...local.dirty, key],
  }
  // Written to the phone at once: closing the app right after must not lose it.
  saveNow()
  emit()
  syncSoon()
}

export function patch<T extends Table>(table: T, id: string, changes: Partial<Row<T>>) {
  const row = local.db[table][id] as Row<T> | undefined
  if (row) save(table, { ...row, ...changes })
}

/** Updates a row here only, for changes that reach the server some other way (see `enqueue`). */
export function keep<T extends Table>(table: T, row: Row<T>) {
  local = { ...local, db: { ...local.db, [table]: { ...local.db[table], [row.id]: row } } }
  saveSoon()
  emit()
}

export function enqueue(call: Call) {
  local = { ...local, calls: [...local.calls, call] }
  // Written to the phone at once: closing the app right after must not lose it.
  saveNow()
  emit()
  syncSoon()
}

// ── Syncing ──

let running: Promise<void> | null = null
let again = false
let soon: ReturnType<typeof setTimeout> | undefined

function syncSoon() {
  clearTimeout(soon)
  soon = setTimeout(() => void sync(), 350)
}

/** Uploads what is waiting and brings down what changed. Callers share one run. */
export function sync(): Promise<void> {
  again = true
  running ??= (async () => {
    try {
      while (again) {
        again = false
        await once()
      }
    } finally {
      running = null
    }
  })()
  return running
}

function forget(key: string) {
  local = { ...local, dirty: local.dirty.filter((k) => k !== key) }
}

/** Sends dirty rows and queued calls, oldest dependencies first. Returns whether the partner should look. */
async function flush(server: Remote): Promise<boolean> {
  let told = false
  for (const { table, id } of uploadOrder(local.dirty)) {
    const key = keyOf(table, id)
    const row = local.db[table][id]
    if (!row) {
      forget(key)
      continue
    }
    try {
      await server.push(table, row)
    } catch (error) {
      if (!(error instanceof RemoteError) || !error.permanent) throw error
      // The server will never take this: drop it here and fetch the truth again from scratch.
      const rows = { ...local.db[table] }
      delete rows[id]
      local = { ...local, db: { ...local.db, [table]: rows }, cursors: {} }
      forget(key)
      problem?.('Un cambio no se ha podido guardar')
      continue
    }
    told = true
    // Changed again while it was on its way: it stays in the queue.
    if (local.db[table][id] === row) forget(key)
  }
  for (const call of [...local.calls]) {
    try {
      if (call.kind === 'open') await server.openSlip(call.slip, call.loved)
      else await server.notify(call.what, call.ref)
    } catch (error) {
      const permanent = error instanceof RemoteError && error.permanent
      // A notice is a courtesy: it waits only while the phone is really offline, and it never holds up
      // anything else (the function may not even be deployed).
      if (call.kind === 'notify' ? !navigator.onLine : !permanent) break
    }
    told ||= call.kind === 'open'
    local = { ...local, calls: local.calls.filter((c) => c.id !== call.id) }
  }
  return told
}

function connect() {
  const partner = local.db.profiles[me]?.partner_id ?? ''
  if (!remote || partner === channelWith) return
  channel?.close()
  channelWith = partner
  channel = partner
    ? remote.channel(me, partner, (signal) => {
        if (signal === 'cambio') void sync()
        else signalListeners.forEach((listener) => listener(signal))
      })
    : null
}

async function once() {
  const server = remote
  const user = me
  if (!server || !user) return
  try {
    const told = await flush(server)
    const pulled = await server.pull(local.cursors)
    if (me !== user) return
    local = {
      ...local,
      db: mergePull(local.db, new Set(local.dirty), pulled),
      cursors: advance(local.cursors, pulled),
    }
    status = { ...status, offline: false }
    connect()
    if (told) channel?.send('cambio')
  } catch {
    if (me !== user) return
    status = { ...status, offline: true }
  }
  saveSoon()
  emit()
}

// ── Lifecycle ──

function wake() {
  if (document.visibilityState === 'visible') void sync()
  else saveNow()
}
let heartbeat: ReturnType<typeof setInterval> | undefined

/** Loads this person's local copy and starts keeping it in step with the server. */
export async function openStore(server: Remote, userId: string, onProblem: (message: string) => void) {
  remote = server
  me = userId
  problem = onProblem
  local = fresh()
  try {
    const stored = await get<Local>(storageKey(userId))
    if (stored?.v === 1 && me === userId) local = stored
  } catch {
    // Without IndexedDB (private windows) the app still works for as long as it stays open.
  }
  emit()
  window.addEventListener('online', wake)
  document.addEventListener('visibilitychange', wake)
  window.addEventListener('pagehide', saveNow)
  heartbeat = setInterval(wake, 60_000)
  await sync()
}

export function closeStore({ wipe = false } = {}) {
  const user = me
  clearTimeout(saveTimer)
  clearTimeout(soon)
  clearInterval(heartbeat)
  saveTimer = undefined
  window.removeEventListener('online', wake)
  document.removeEventListener('visibilitychange', wake)
  window.removeEventListener('pagehide', saveNow)
  channel?.close()
  channel = null
  channelWith = ''
  me = ''
  local = fresh()
  status = { pending: 0, offline: false }
  if (wipe && user) void del(storageKey(user)).catch(() => {})
  emit()
}
