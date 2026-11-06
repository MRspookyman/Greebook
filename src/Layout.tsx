import { Navigate, Outlet } from 'react-router'
import { TabBar } from '@/components/TabBar'
import { useMe } from '@/features/auth/me'
import { useRealtimeSync } from '@/features/us/useRealtimeSync'
import { useOfflineSync } from '@/lib/offline/sessionQueue'
import { SurpriseHost } from '@/features/surprises/SurpriseHost'

export function Layout() {
  const { profile } = useMe()
  useRealtimeSync()
  useOfflineSync()

  if (!profile.onboarded_at) return <Navigate to="/bienvenida" replace />

  return (
    <>
      <main
        className="max-w-xl mx-auto px-4"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 1rem)',
          paddingBottom: 'calc(76px + env(safe-area-inset-bottom))',
        }}
      >
        <Outlet />
      </main>
      <TabBar />
      <SurpriseHost />
    </>
  )
}
