import { useLocation, useNavigate } from 'react-router'

/**
 * «Volver»: one step back in the app's history, or to the room when this screen was the first one opened
 * (from a notification, a shortcut or a reload), where going back would leave the app.
 */
export function useBack(): () => void {
  const navigate = useNavigate()
  const { key } = useLocation()
  return () => (key === 'default' ? navigate('/', { replace: true }) : navigate(-1))
}
