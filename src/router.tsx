import { createBrowserRouter, Navigate } from 'react-router'
import { RoomRedirect } from '@/features/quotes/RoomRedirect'
import { CitasPage } from '@/features/quotes/CitasPage'
import { Layout } from './Layout'
import { TodayPage } from '@/features/today/TodayPage'
import { LibraryPage } from '@/features/library/LibraryPage'
import { SearchPage } from '@/features/library/SearchPage'
import { BookPage } from '@/features/book/BookPage'
import { StatsPage } from '@/features/stats/StatsPage'
import { UsPage } from '@/features/us/UsPage'
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
      { path: 'calendario', element: <Navigate to="/stats" replace /> },
      { path: 'nosotros', element: <UsPage /> },
      { path: 'citas', element: <CitasPage /> },
      { path: 'sala/:bookId', element: <RoomRedirect /> },
      { path: 'club/:bookId', element: <RoomRedirect /> },
      { path: 'perfil', element: <ProfilePage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
