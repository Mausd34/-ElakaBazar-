import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'

type Props = {
  children: import('react').ReactNode
  allowedRoles?: string[]
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div className="page">লোড হচ্ছে…</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole?.(user?.role || '')) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}