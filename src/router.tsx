import { createBrowserRouter } from 'react-router'
import { Layout } from './Layout'
import { TodayPage } from '@/features/today/TodayPage'
import { LibraryPage } from '@/features/library/LibraryPage'
import { SearchPage } from '@/features/library/SearchPage'
import { BookPage } from '@/features/book/BookPage'
import { CalendarPage } from '@/features/calendar/CalendarPage'
import { UsPage } from '@/features/us/UsPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { WelcomePage } from '@/features/onboarding/WelcomePage'

export const router = createBrowserRouter([
  { path: '/bienvenida', element: <WelcomePage /> },
  {
    element: <Layout />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'biblioteca', element: <LibraryPage /> },
      { path: 'biblioteca/buscar', element: <SearchPage /> },
      { path: 'libro/:readingId', element: <BookPage /> },
      { path: 'calendario', element: <CalendarPage /> },
      { path: 'nosotros', element: <UsPage /> },
      { path: 'perfil', element: <ProfilePage /> },
      { path: '*', element: <TodayPage /> },
    ],
  },
])
