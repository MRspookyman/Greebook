import Dexie, { type Table } from 'dexie'
import type { Reading, Session } from '@/lib/types'

export interface PendingSession {
  id: string
  kind: 'session'
  payload: { session: Session; readingPatch: Partial<Reading> }
  createdAt: number
}
class SessionDatabase extends Dexie {
  pendingOps!: Table<PendingSession, string>
  constructor() {
    super('greenbook-offline')
    this.version(1).stores({ pendingOps: 'id, createdAt' })
  }
}
export const offlineDb = new SessionDatabase()
