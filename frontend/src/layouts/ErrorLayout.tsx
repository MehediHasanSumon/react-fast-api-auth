import { Outlet } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'

export const ErrorLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans text-gray-900 dark:text-gray-100 antialiased selection:bg-blue-100 selection:text-blue-700 transition-colors duration-150 relative">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-xl">
        <Outlet />
      </div>
    </div>
  )
}
