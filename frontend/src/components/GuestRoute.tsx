import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '../store/hooks'

export const GuestRoute = () => {
  const { isAuthenticated, user, isLoading } = useAppSelector((state) => state.auth)

  if (isLoading) {
    return null
  }

  if (isAuthenticated && user) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
