import { createClient } from '@supabase/supabase-js'
import type { Book, Profile, Reading, Session, Slip } from '../types'
import { RemoteError, type Remote } from './remote'

const PAGE = 1000
const RETRY = new Set([401, 408, 429])

/** Rejected data fails for good; anything else (no network, expired session, server down) is retried. */
function failure(error: { message: string }, status = 0): RemoteError {
  return new RemoteError(error.message, status >= 400 && status < 500 && !RETRY.has(status))
}

export function create(): Remote {
  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON_KEY!)

  /** Rows changed since the cursor, oldest first, paging past PostgREST's row cap. */
  async function since<T>(table: 'books' | 'readings' | 'sessions', cursor: string | undefined): Promise<T[]> {
    const rows: T[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error, status } = await supabase
        .from(table)
        .select('*')
        // `gte`: a row written in the same instant as the cursor is fetched again rather than missed.
        .gte('updated_at', cursor ?? '1970-01-01')
        .order('updated_at')
        .order('id')
        .range(from, from + PAGE - 1)
      if (error) throw failure(error, status)
      rows.push(...(data as T[]))
      if (data.length < PAGE) return rows
    }
  }

  return {
    ensayo: false,

    async userId() {
      const { data } = await supabase.auth.getSession()
      return data.session?.user.id ?? null
    },
    onAuth(listener) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => listener(session?.user.id ?? null))
      return () => data.subscription.unsubscribe()
    },
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw failure(error, error.status)
    },
    async signOut() {
      await supabase.auth.signOut()
    },

    async pull(cursors) {
      const [profiles, books, readings, sessions, slips] = await Promise.all([
        supabase.from('profiles').select('*'),
        since<Book>('books', cursors.books),
        since<Reading>('readings', cursors.readings),
        since<Session>('sessions', cursors.sessions),
        supabase.rpc('slips_for_me'),
      ])
      if (profiles.error) throw failure(profiles.error, profiles.status)
      if (slips.error) throw failure(slips.error, slips.status)
      return {
        profiles: profiles.data as Profile[],
        books,
        readings,
        sessions,
        slips: (slips.data as Slip[]).map((s) => ({ ...s, at: s.at == null ? null : Number(s.at) })),
      }
    },

    async push(table, row) {
      // The server stamps `updated_at`; `locked` only exists on the way down.
      const rest: Record<string, unknown> = { ...row }
      delete rest.updated_at
      delete rest.locked
      if (table === 'profiles') {
        const p = row as Profile
        const { error, status } = await supabase
          .from('profiles')
          .update({
            name: p.name,
            color: p.color,
            timezone: p.timezone,
            welcomed_at: p.welcomed_at,
            candle_lit_at: p.candle_lit_at,
            candle_reading_id: p.candle_reading_id,
          })
          .eq('id', p.id)
        if (error) throw failure(error, status)
        return
      }
      if (table === 'slips') {
        // Whether it was opened belongs to whoever received it.
        delete rest.seen_at
        delete rest.loved
      }
      const { error, status } = await supabase.from(table).upsert(rest, { onConflict: 'id' })
      if (error) throw failure(error, status)
    },

    async openSlip(id, loved) {
      const { error, status } = await supabase.rpc('open_slip', { p_id: id, p_loved: loved })
      if (error) throw failure(error, status)
    },

    async notify(what, ref) {
      // A notice is a courtesy. Whatever goes wrong, the store decides whether it is worth another try.
      const { error } = await supabase.functions.invoke('avisar', { body: { what, ref } })
      if (error) throw failure(error)
    },

    channel(me, partner, on) {
      const topic = `pareja:${[me, partner].sort().join(':')}`
      const channel = supabase.channel(topic, { config: { private: true, broadcast: { self: false } } })
      channel
        .on('broadcast', { event: 'cambio' }, () => on('cambio'))
        .on('broadcast', { event: 'guino' }, () => on('guino'))
        .subscribe()
      return {
        send: (signal) => void channel.send({ type: 'broadcast', event: signal, payload: {} }),
        close: () => void supabase.removeChannel(channel),
      }
    },

    async uploadCover(image) {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user.id
      if (!user) throw new RemoteError('Sin sesión', false)
      // Each photo gets its own name inside the uploader's folder: nothing is ever overwritten.
      const path = `${user}/${crypto.randomUUID()}.jpg`
      const { error } = await supabase.storage.from('book-covers').upload(path, image, { contentType: 'image/jpeg', cacheControl: '31536000' })
      if (error) throw new RemoteError(error.message, false)
      return supabase.storage.from('book-covers').getPublicUrl(path).data.publicUrl
    },

    async claimPush(keys) {
      const { error, status } = await supabase.rpc('claim_push_subscription', {
        p_endpoint: keys.endpoint,
        p_p256dh: keys.p256dh,
        p_auth: keys.auth,
      })
      if (error) throw failure(error, status)
    },
    async dropPush(endpoint) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
    },
    async hasPush(endpoint) {
      const { data } = await supabase.from('push_subscriptions').select('id').eq('endpoint', endpoint).maybeSingle()
      return !!data
    },
  }
}
