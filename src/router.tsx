import { createBrowserRouter, Navigate } from 'react-router'
import { CitasPage } from '@/features/quotes/CitasPage'
import { Layout } from './Layout'
import { TodayPage } from '@/features/today/TodayPage'
import { LibraryPage } from '@/features/library/LibraryPage'
import { SearchPage } from '@/features/library/SearchPage'
import { BookPage } from '@/features/book/BookPage'
import { StatsPage } from '@/features/stats/StatsPage'
import { UsPage } from '@/features/us/UsPage'
import { RachaPage } from '@/features/us/RachaPage'
import { DiaryPage } from '@/features/diary/DiaryPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { WelcomePage } from '@/features/onboarding/WelcomePage'
import { SessionPage } from '@/features/session/SessionPage'


export const router = createBrowserRouter([
  { path: '/bienvenida', element: <WelcomePage /> },
  {
    element: <Layout />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'biblioteca', element: <LibraryPage /> },
      { path: 'biblioteca/buscar', element: <SearchPage /> },
      { path: 'libro/:readingId', element: <BookPage /> },
      { path: 'leer', element: <SessionPage /> },
      { path: 'leer/:readingId', element: <SessionPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'nosotros', element: <UsPage /> },
      { path: 'nosotros/racha', element: <RachaPage /> },
      { path: 'nosotros/diario', element: <DiaryPage /> },
      { path: 'citas', element: <CitasPage /> },
      { path: 'perfil', element: <ProfilePage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
