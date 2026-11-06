import { createBrowserRouter, Navigate, useParams } from 'react-router'
import { Layout } from './Layout'
import { TodayPage } from '@/features/today/TodayPage'
import { LibraryPage } from '@/features/library/LibraryPage'
import { SearchPage } from '@/features/library/SearchPage'
import { BookPage } from '@/features/book/BookPage'
import { StatsPage } from '@/features/stats/StatsPage'
import { UsPage } from '@/features/us/UsPage'
import { SalaPage } from '@/features/us/SalaPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { WelcomePage } from '@/features/onboarding/WelcomePage'

function ClubRedirect() {
  const { bookId } = useParams()
  return <Navigate to={`/sala/${bookId}`} replace />
}

export const router = createBrowserRouter([
  { path: '/bienvenida', element: <WelcomePage /> },
  {
    element: <Layout />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'biblioteca', element: <LibraryPage /> },
      { path: 'biblioteca/buscar', element: <SearchPage /> },
      { path: 'libro/:readingId', element: <BookPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'calendario', element: <Navigate to="/stats" replace /> },
      { path: 'nosotros', element: <UsPage /> },
      { path: 'sala/:bookId', element: <SalaPage /> },
      { path: 'club/:bookId', element: <ClubRedirect /> },
      { path: 'perfil', element: <ProfilePage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
