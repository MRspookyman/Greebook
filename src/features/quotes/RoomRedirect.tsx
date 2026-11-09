import { Navigate, useParams } from 'react-router'
import { useMe } from '@/features/auth/me'
import { useReadings } from '@/lib/data'
import { myReadingOf } from './quotes'

/** Old book rooms and clubs now live in the book itself (its quotes and both progresses). */
export function RoomRedirect() {
  const { bookId } = useParams()
  const { userId } = useMe()
  const readings = useReadings(userId)
  if (readings.isPending) return null
  const mine = bookId ? myReadingOf(readings.data, bookId) : undefined
  return <Navigate to={mine ? `/libro/${mine.id}` : '/citas'} replace />
}
