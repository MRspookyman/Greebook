import { useRef, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { TabBar } from '@/components/TabBar'
import { useMe } from '@/features/auth/me'
import { useRealtimeSync } from '@/features/us/useRealtimeSync'
import { useOfflineSync } from '@/lib/offline/sessionQueue'
import { SurpriseHost } from '@/features/surprises/SurpriseHost'
import { LogSessionSheet } from '@/features/session/LogSessionSheet'

const TAB_ORDER = ['/', '/biblioteca', '/stats', '/nosotros']

/** Index used to pick the slide direction between screens (deeper routes slide in from the right). */
function depthOf(path: string): number {
  const tab = TAB_ORDER.findIndex((t) => (t === '/' ? path === '/' : path.startsWith(t)))
  return tab >= 0 && TAB_ORDER.includes(path) ? tab : 10
}

export function Layout() {
  const { profile } = useMe()
  const location = useLocation()
  const [adding, setAdding] = useState(false)
  const prev = useRef(location.pathname)
  useRealtimeSync()
  useOfflineSync()

  const from = depthOf(location.pathname) >= depthOf(prev.current) ? '16px' : '-16px'
  prev.current = location.pathname

  if (!profile.onboarded_at) return <Navigate to="/bienvenida" replace />

  return (
    <>
      <main
        className="mx-auto max-w-xl px-[18px]"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
          paddingBottom: 'calc(96px + env(safe-area-inset-bottom))',
        }}
      >
        <div
          key={location.pathname}
          style={{ animation: 'gb-page-in 0.4s var(--ease) both', ['--page-from' as string]: from }}
        >
          <Outlet />
        </div>
      </main>
      <TabBar onAdd={() => setAdding(true)} />
      <LogSessionSheet open={adding} onClose={() => setAdding(false)} />
      <SurpriseHost />
    </>
  )
}
