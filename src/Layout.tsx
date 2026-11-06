import { useRef, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { TabBar } from '@/components/TabBar'
import { useMe } from '@/features/auth/me'
import { useRealtimeSync } from '@/features/us/useRealtimeSync'
import { useOfflineSync } from '@/lib/offline/sessionQueue'
import { SurpriseHost } from '@/features/surprises/SurpriseHost'
import { LogSessionSheet } from '@/features/session/LogSessionSheet'
import { BottomSheet } from '@/components/BottomSheet'
import { TraceSheet } from '@/features/us/TraceSheet'
import { RatitoSheet } from '@/features/us/RatitoSheet'
import { useRatitoTimer } from '@/features/session/Timer'

const TAB_ORDER = ['/', '/biblioteca', '/stats', '/nosotros']

/** Index used to pick the slide direction between screens (deeper routes slide in from the right). */
function depthOf(path: string): number {
  const tab = TAB_ORDER.findIndex((t) => (t === '/' ? path === '/' : path.startsWith(t)))
  return tab >= 0 && TAB_ORDER.includes(path) ? tab : 10
}

export function Layout() {
  const { profile } = useMe()
  const location = useLocation()
  const [action, setAction] = useState<'menu' | 'log' | 'trace' | 'ratito' | null>(null)
  const prev = useRef(location.pathname)
  useRealtimeSync()
  useOfflineSync()
  useRatitoTimer()

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
      <TabBar onAdd={() => setAction('menu')} />
      <BottomSheet open={action === 'menu'} onClose={() => setAction(null)} title="¿Qué te apetece?">
        <div className="space-y-2 pt-2">
          <button className="btn btn-soft min-h-16 w-full justify-start text-base" onClick={() => setAction('log')}>
            📖 Registrar lectura
          </button>
          <button className="btn btn-soft min-h-16 w-full justify-start text-base" onClick={() => setAction('trace')}>
            💌 Dejarle algo
          </button>
          <button className="btn btn-soft min-h-16 w-full justify-start text-base" onClick={() => setAction('ratito')}>
            ☕ Invitar a un ratito
          </button>
        </div>
      </BottomSheet>
      <LogSessionSheet open={action === 'log'} onClose={() => setAction(null)} />
      <TraceSheet open={action === 'trace'} onClose={() => setAction(null)} />
      <RatitoSheet open={action === 'ratito'} onClose={() => setAction(null)} />
      <SurpriseHost />
    </>
  )
}
