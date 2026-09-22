import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { onAuthUnauthorized } from './api'
import { useAppDispatch } from './store/hooks'
import { clearUser } from './store/slices/authSlice'

function App() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const unsubscribe = onAuthUnauthorized((reason) => {
      // 1. Immediately wipe Redux authentication state so GuestRoute doesn't bounce back to dashboard
      dispatch(clearUser())

      const currentPath = window.location.pathname
      const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/confirm-password']
      if (publicPaths.some((p) => currentPath.startsWith(p))) {
        return
      }

      if (reason === 'session_expired' || reason === 'refresh_failed') {
        void router.navigate('/session-expired')
      } else if (reason === 'user_removed') {
        void router.navigate('/login', { state: { reason: 'user_removed' }, replace: true })
      } else if (reason === 'user_blocked') {
        void router.navigate('/login', { state: { reason: 'user_blocked' }, replace: true })
      } else {
        void router.navigate('/login', { state: { reason }, replace: true })
      }
    })
    return () => unsubscribe()
  }, [dispatch])

  return <RouterProvider router={router} />
}

export default App
