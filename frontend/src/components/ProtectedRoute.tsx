import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchCurrentUser, clearUser } from '../store/slices/authSlice'
import { clearAuthTokens } from '../api'

export const ProtectedRoute = () => {
  const { isAuthenticated, user, isLoading } = useAppSelector((state) => state.auth)
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const lastCheckTimeRef = useRef<number>(0)
  const isCheckingRef = useRef<boolean>(false)
  const prevPathRef = useRef<string>(location.pathname)

  // Real-time session verification across all protected routes
  useEffect(() => {
    if (!isAuthenticated || !user) return

    let isMounted = true

    const verifySession = async (force = false) => {
      if (isCheckingRef.current) return
      const now = Date.now()
      // Skip throttle if forced (e.g. route transition), otherwise throttle to 2s
      if (!force && now - lastCheckTimeRef.current < 2000) return
      lastCheckTimeRef.current = now
      isCheckingRef.current = true

      try {
        await dispatch(fetchCurrentUser()).unwrap()
      } catch (err: unknown) {
        const errorObj = err as { isAuthError?: boolean; message?: string }
        if (isMounted && errorObj?.isAuthError) {
          dispatch(clearUser())
          clearAuthTokens()
          const msg = (errorObj.message || '').toLowerCase()
          const isRemoved = msg.includes('not found') || msg.includes('removed')
          const isBlocked = msg.includes('banned') || msg.includes('blocked')

          const reason = isRemoved
            ? 'user_removed'
            : isBlocked
            ? 'user_blocked'
            : 'session_expired'

          navigate('/login', { replace: true, state: { reason } })
        }
      } finally {
        isCheckingRef.current = false
      }
    }

    // 1. If route actually changed via SPA navigation, force immediate verification
    const isNewRoute = prevPathRef.current !== location.pathname
    prevPathRef.current = location.pathname
    void verifySession(isNewRoute)

    // 2. Verify on tab focus & visibility change when user returns to tab (throttled)
    const handleFocus = () => void verifySession(false)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void verifySession(false)
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMounted = false
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [location.pathname, isAuthenticated, user, dispatch, navigate])

  if (isLoading) {
    return null
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
