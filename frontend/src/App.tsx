import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { onAuthUnauthorized } from './api'

function App() {
  useEffect(() => {
    const unsubscribe = onAuthUnauthorized((reason) => {
      if (reason === 'session_expired' || reason === 'refresh_failed') {
        void router.navigate('/session-expired')
      } else {
        void router.navigate('/login')
      }
    })
    return () => unsubscribe()
  }, [])

  return <RouterProvider router={router} />
}

export default App
