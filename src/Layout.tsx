import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { TabBar } from '@/components/TabBar'
import { useMe } from '@/features/auth/me'
import { useRealtimeSync } from '@/features/us/useRealtimeSync'
import { useOfflineSync } from '@/lib/offline/sessionQueue'
import { SurpriseHost } from '@/features/surprises/SurpriseHost'
import { useRatitoTimer } from '@/features/session/Timer'
import { NightContext } from '@/components/night'

const TAB_ORDER = ['/', '/biblioteca', '/stats', '/nosotros']

/** Index used to pick the slide direction between screens (deeper routes slide in from the right). */
function depthOf(path: string): number {
  const tab = TAB_ORDER.findIndex((t) => (t === '/' ? path === '/' : path.startsWith(t)))
  return tab >= 0 && TAB_ORDER.includes(path) ? tab : 10
}

export function Layout() {
  const { profile } = useMe()
  const location = useLocation()
  const prev = useRef(location.pathname)
  const mainRef = useRef<HTMLElement>(null)
  const focusedRoute = useRef(location.pathname)
  useEffect(() => {
    if (focusedRoute.current !== location.pathname) {
      focusedRoute.current = location.pathname
      mainRef.current?.focus({ preventScroll: true })
    }
  }, [location.pathname])
  useRealtimeSync()
  useOfflineSync()
  useRatitoTimer()

  // The reading screen is a focus mode: lamp-lit, it rises like a sheet and hides the tab bar.
  const focus = location.pathname.startsWith('/leer')
  const fromFocus = prev.current.startsWith('/leer') && !focus
  const from = depthOf(location.pathname) >= depthOf(prev.current) ? '16px' : '-16px'
  prev.current = location.pathname

  if (!profile.onboarded_at) return <Navigate to="/bienvenida" replace />

  return (
    <>
      <a
        className="sr-only z-50 min-h-11 rounded-full bg-surface p-3 font-extrabold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        href="#main-content"
      >
        Ir al contenido
      </a>
      {focus && (
        <div
          aria-hidden
          className="night fixed inset-0 -z-10"
          style={{ backgroundImage: 'radial-gradient(85% 42% at 50% -6%, var(--lamp-strong), transparent 72%)' }}
        />
      )}
      <main
        ref={mainRef}
        id="main-content"
        tabIndex={-1}
        className={`mx-auto max-w-xl px-5 ${focus ? 'night min-h-dvh bg-transparent' : ''}`}
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 22px)',
          paddingBottom: focus
            ? 'calc(112px + env(safe-area-inset-bottom))'
            : 'calc(var(--tabbar-h) + 44px + env(safe-area-inset-bottom))',
        }}
      >
        <div
          key={location.pathname}
          style={{
            animation: focus
              ? 'gb-sheet-up 0.42s var(--ease) both'
              : fromFocus
                ? 'gb-fade-in 0.3s var(--ease) both'
                : 'gb-page-in 0.4s var(--ease) both',
            ['--page-from' as string]: from,
          }}
        >
          <NightContext.Provider value={focus}>
            <Outlet />
          </NightContext.Provider>
        </div>
      </main>
      {!focus && <TabBar />}
      <SurpriseHost />
    </>
  )
}
