import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/lib/data'
import { queryClient } from '@/lib/queryClient'
import type { Profile } from '@/lib/types'
import { LoginPage } from './LoginPage'
import { MeContext } from './me'
import { Splash } from '@/components/Splash'

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'SIGNED_OUT') queryClient.clear()
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <Splash />
  if (!session) return <LoginPage />
  return <MeProvider userId={session.user.id}>{children}</MeProvider>
}

function MeProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const profile = useProfile(userId)
  const partner = useProfile(profile.data?.partner_id)

  useApplyProfileToDocument(profile.data)

  if (profile.isPending) return <Splash />
  if (profile.isError) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h2>No se ha podido cargar tu perfil</h2>
        <p className="text-muted">
          Comprueba la conexión. Si persiste, falta tu fila en «profiles» (ver supabase/seed.sql).
        </p>
        <button className="btn btn-secondary" onClick={() => profile.refetch()}>
          Reintentar
        </button>
        <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </button>
      </div>
    )
  }
  if (profile.data.partner_id && partner.isPending) return <Splash />

  return (
    <MeContext.Provider value={{ userId, profile: profile.data, partner: partner.data ?? null }}>
      {children}
    </MeContext.Provider>
  )
}

function useApplyProfileToDocument(profile: Profile | undefined) {
  useEffect(() => {
    const root = document.documentElement
    if (!profile) return
    root.dataset.accent = profile.accent
    if (profile.theme === 'system') delete root.dataset.theme
    else root.dataset.theme = profile.theme
  }, [profile?.accent, profile?.theme])
}
