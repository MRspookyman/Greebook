import type { Row, Table } from '../types'
import type { Cursors, Pulled } from './merge'

/** What the partner should hear about. The server writes the message; the app only says what happened. */
export type Notice = 'vela' | 'papel' | 'hallazgo' | 'final'
/** What travels live between the two phones and is never stored. */
export type Signal = 'cambio' | 'guino'

export class RemoteError extends Error {
  /** A permanent failure will fail again if retried (rejected data); a temporary one is the network. */
  readonly permanent: boolean
  constructor(message: string, permanent: boolean) {
    super(message)
    this.permanent = permanent
  }
}

export interface Channel {
  send(signal: Signal): void
  close(): void
}

export interface PushKeys {
  endpoint: string
  p256dh: string
  auth: string
}

/** Everything the app needs from a server. Supabase is one; the «ensayo» in the browser is another. */
export interface Remote {
  /** True for the rehearsal server that lives in this browser. */
  readonly ensayo: boolean
  userId(): Promise<string | null>
  onAuth(listener: (userId: string | null) => void): () => void
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  pull(cursors: Cursors): Promise<Pulled>
  push<T extends Table>(table: T, row: Row<T>): Promise<void>
  openSlip(id: string, loved: boolean | null): Promise<void>
  notify(what: Notice, ref: string): Promise<void>
  channel(me: string, partner: string, on: (signal: Signal) => void): Channel
  /** Stores a cover photo and returns the address it can be shown from. Needs a connection. */
  uploadCover(image: Blob): Promise<string>
  claimPush(keys: PushKeys): Promise<void>
  dropPush(endpoint: string): Promise<void>
  hasPush(endpoint: string): Promise<boolean>
}

let loading: Promise<Remote> | undefined

/** Supabase when it is configured; otherwise the rehearsal server, so the app always runs. */
export function loadRemote(): Promise<Remote> {
  loading ??= import.meta.env.VITE_SUPABASE_URL
    ? import('./supabaseRemote').then((m) => m.create())
    : import('./demoRemote').then((m) => m.create())
  return loading
}
