import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { loadRemote, type Remote } from '@/lib/sync/remote'
import { closeStore, getDb, openStore, sync, useDb, useSyncStatus } from '@/lib/sync/store'
import { SessionContext } from './session'
import { disablePush, reclaimPush } from '@/lib/push'
import { toast } from '@/ui/toast'
import { Toaster } from '@/ui/Toaster'
import { Nav } from '@/ui/Nav'
import { Login } from '@/screens/Login'
import { Welcome } from '@/screens/Welcome'
import { Room } from '@/screens/Room'
import { Evening } from '@/screens/Evening'
import { BookPage } from '@/screens/BookPage'
import { AddBook } from '@/screens/AddBook'
import { Settings } from '@/screens/Settings'

function Blank() {
  return <div className="min-h-dvh bg-bg" aria-busy="true" />
}

export default function App() {
  const [remote, setRemote] = useState<Remote | null>(null)
  /** undefined while we don't know yet; null when signed out. */
  const [userId, setUserId] = useState<string | null | undefined>(undefined)
  /** Whose local copy is loaded and ready to show. */
  const [readyFor, setReadyFor] = useState<string | null>(null)
  const ready = !!userId && readyFor === userId

  useEffect(() => {
    let alive = true
    void loadRemote().then((server) => alive && setRemote(server))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!remote) return
    let alive = true
    void remote.userId().then((id) => alive && setUserId(id))
    const stop = remote.onAuth(setUserId)
    return () => {
      alive = false
      stop()
    }
  }, [remote])

  useEffect(() => {
    if (!remote || !userId) return
    let alive = true
    void openStore(remote, userId, toast).then(() => alive && setReadyFor(userId))
    void reclaimPush(remote)
    return () => {
      alive = false
      closeStore()
    }
  }, [remote, userId])

  const signOut = useCallback(async () => {
    // Nothing of yours stays on a phone you have left.
    if (remote) await disablePush(remote)
    closeStore({ wipe: true })
    await remote?.signOut()
  }, [remote])

  return (
    <>
      {!remote || userId === undefined ? (
        <Blank />
      ) : !userId ? (
        <Login remote={remote} />
      ) : !ready ? (
        <Blank />
      ) : (
        <SessionContext.Provider value={{ remote, userId, signOut }}>
          <Gate userId={userId} />
        </SessionContext.Provider>
      )}
      <Toaster />
    </>
  )
}

/** Waits for your profile, dresses the app in your two colours, and lets you in. */
function Gate({ userId }: { userId: string }) {
  const db = useDb()
  const status = useSyncStatus()
  const me = db.profiles[userId]
  const partner = me?.partner_id ? db.profiles[me.partner_id] : undefined

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--me', `var(--${me?.color ?? 'miel'})`)
    root.style.setProperty('--you', `var(--${partner?.color ?? 'salvia'})`)
  }, [me?.color, partner?.color])

  if (!me) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-7">
        <h1 className="display">No encuentro tu sitio en la habitación</h1>
        <p className="quiet">
          {status.offline
            ? 'Parece que no hay conexión. La primera vez hace falta para traer lo vuestro.'
            : 'Tu cuenta existe, pero falta emparejarla (supabase/seed.sql).'}
        </p>
        <button className="btn btn-primary self-start" onClick={() => void sync().then(() => getDb())}>
          Probar otra vez
        </button>
      </main>
    )
  }
  if (!me.welcomed_at) return <Welcome />
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Room section="velas" />} />
        <Route path="/mesilla" element={<Room section="mesilla" />} />
        <Route path="/estanteria" element={<Room section="estanteria" />} />
        <Route path="/velada" element={<Evening />} />
        <Route path="/libro/:bookId" element={<BookPage />} />
        <Route path="/anadir" element={<AddBook />} />
        <Route path="/ajustes" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Nav />
    </BrowserRouter>
  )
}
