import { RouterProvider } from 'react-router'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { persistOptions, queryClient } from '@/lib/queryClient'
import { AuthGate } from '@/features/auth/AuthGate'
import { Toaster } from '@/components/toast'
import { router } from './router'

export default function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <AuthGate>
        <RouterProvider router={router} />
      </AuthGate>
      <Toaster />
    </PersistQueryClientProvider>
  )
}
