import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigationType } from 'react-router'
import { loadRemote, type Remote } from '@/lib/sync/remote'
import { closeStore, openStore, sync, useDb, useSyncStatus } from '@/lib/sync/store'
import { SessionContext, useSession } from './session'
import { pendingInvite } from '@/lib/invite'
import { isLit } from '@/lib/model'
import { clearCandleNotice, showCandleNotice } from '@/lib/ongoing'
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
import { Notes } from '@/screens/Notes'

function Blank() {
  return <div className="min-h-dvh bg-bg" aria-busy="true" />
}

/** Where each screen of the history was scrolled to, so «atrás» returns to the same place. */
const scrolled = new Map<string, number>()

/** A new screen opens at its top; going back returns where you were. Links to a #section scroll themselves. */
function ScrollToTop() {
  const { key, hash } = useLocation()
  const type = useNavigationType()
  useLayoutEffect(() => {
    history.scrollRestoration = 'manual'
    let frame = 0
    if (type === 'POP') {
      // Some screens (the shelf) measure themselves first and grow a frame or two later.
      const target = scrolled.get(key) ?? 0
      let tries = 0
      const restore = () => {
        window.scrollTo(0, target)
        if (window.scrollY < target - 1 && ++tries < 30) frame = requestAnimationFrame(restore)
      }
      restore()
    } else if (!hash) window.scrollTo(0, 0)
    // Kept while scrolling: by the time the next screen renders, this one is already gone.
    const remember = () => void scrolled.set(key, window.scrollY)
    window.addEventListener('scroll', remember, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', remember)
    }
  }, [key, hash, type])
  return null
}
/** Browser chrome follows the room, including the always-dark reading screen. */
function BrowserAppearance() {
  const { pathname } = useLocation()
  const db = useDb()
  const bookId = pathname.startsWith('/libro/') ? pathname.split('/')[2] : undefined
  const title = bookId ? db.books[bookId]?.title ?? 'Libro' : ({
    '/': 'Velas', '/mesilla': 'Mesilla', '/estanteria': 'Estantería',
    '/velada': 'Velada', '/notas': 'Las notas', '/anadir': 'Añadir un libro', '/ajustes': 'Tu vela',
  } as Record<string, string>)[pathname]
  useLayoutEffect(() => {
    document.title = title ? `Greenbook · ${title}` : 'Greenbook'
    const update = () => {
      const surface = pathname === '/velada' ? document.querySelector('.night') : document.documentElement
      const color = getComputedStyle(surface ?? document.documentElement).getPropertyValue('--bg').trim()
      document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', color)
    }
    update()
    const scheme = window.matchMedia('(prefers-color-scheme: dark)')
    scheme.addEventListener('change', update)
    return () => scheme.removeEventListener('change', update)
  }, [pathname, title])
  return null
}


export default function App() {
  const [remote, setRemote] = useState<Remote | null>(null)
  /** undefined while we don't know yet; null when signed out. */
  const [userId, setUserId] = useState<string | null | undefined>(undefined)
  /** Whose local copy is loaded and ready to show. */
  const [readyFor, setReadyFor] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
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
    // Keep the room hidden before its local profile disappears.
    if (remote) await disablePush(remote)
    flushSync(() => setLeaving(true))
    closeStore({ wipe: true })
    try {
      await remote?.signOut()
      setUserId(null)
      setReadyFor(null)
    } catch {
      if (remote && userId) await openStore(remote, userId, toast)
      toast('No he podido cerrar la sesión. Prueba otra vez.')
    } finally {
      setLeaving(false)
    }
  }, [remote, userId])

  return (
    <BrowserRouter>
      <BrowserAppearance />
      {leaving || !remote || userId === undefined ? (
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
    </BrowserRouter>
  )
}

/** Waits for your profile, dresses the app in your two colours, and lets you in. */
function Gate({ userId }: { userId: string }) {
  const db = useDb()
  const status = useSyncStatus()
  const [retrying, setRetrying] = useState(false)
  const { remote } = useSession()
  const { pathname } = useLocation()
  const me = db.profiles[userId]
  // The first time nobody has made your place yet: ask for it, then bring it down.
  const missing = !me
  const [making, setMaking] = useState(missing)
  useEffect(() => {
    if (!missing) return
    let alive = true
    void remote
      .ensureProfile()
      .then(() => sync())
      .catch(() => {})
      .finally(() => alive && setMaking(false))
    return () => {
      alive = false
    }
  }, [missing, remote])
  const partner = me?.partner_id ? db.profiles[me.partner_id] : undefined

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--me', `var(--${me?.color ?? 'miel'})`)
    root.style.setProperty('--you', `var(--${partner?.color ?? 'salvia'})`)
  }, [me?.color, partner?.color])

  // While my candle burns, the phone carries a notice that counts the time, like a timer's.
  const litAt = me?.candle_lit_at ?? null
  const candleBook = me?.candle_reading_id ? db.books[db.readings[me.candle_reading_id]?.book_id ?? '']?.title : undefined
  useEffect(() => {
    if (litAt && isLit({ candle_lit_at: litAt }, Date.now())) void showCandleNotice(litAt, candleBook ?? null)
    else void clearCandleNotice()
  }, [litAt, candleBook])
  // Nothing of yours stays on the lock screen of a phone you have signed out of.
  useEffect(() => () => void clearCandleNotice(), [])

  if (!me && making) return <Blank />
  if (!me) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-7">
        <h1 className="display">No encuentro tu sitio en la habitación</h1>
        <p className="quiet">
          {status.offline
            ? 'Parece que no hay conexión. La primera vez hace falta para traer lo vuestro.'
            : 'No he podido preparar tu sitio. Prueba otra vez en un momento.'}
        </p>
        <button
          className="btn btn-primary self-start"
          disabled={retrying}
          aria-busy={retrying}
          onClick={() => {
            setRetrying(true)
            void remote
              .ensureProfile()
              .catch(() => {})
              .then(() => sync())
              .finally(() => setRetrying(false))
          }}
        >
          {retrying ? 'Buscando tu sitio…' : 'Probar otra vez'}
        </button>
      </main>
    )
  }
  if (!me.welcomed_at) return <Welcome />
  // Arrived by an invitation link: straight to where it is accepted.
  if (!partner && pendingInvite() && pathname !== '/ajustes') return <Navigate to="/ajustes#pareja" replace />
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Room section="velas" />} />
        <Route path="/mesilla" element={<Room section="mesilla" />} />
        <Route path="/estanteria" element={<Room section="estanteria" />} />
        <Route path="/notas" element={<Notes />} />
        <Route path="/velada" element={<Evening />} />
        <Route path="/libro/:bookId" element={<BookPage />} />
        <Route path="/anadir" element={<AddBook />} />
        <Route path="/ajustes" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Nav />
    </>
  )
}
