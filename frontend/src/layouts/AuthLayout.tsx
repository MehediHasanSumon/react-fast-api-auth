import { Outlet, Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { ThemeToggle } from '../components/ThemeToggle'

export const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans text-gray-900 dark:text-gray-100 antialiased selection:bg-blue-100 selection:text-blue-700 transition-colors duration-150 relative">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      {/* Centered Minimal Brand */}
      <div className="mb-6 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 hover:opacity-90 transition cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="font-semibold text-lg text-gray-900 dark:text-white tracking-tight">
            Access Management Portal
          </span>
        </Link>
      </div>

      {/* Centered Form Container */}
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  )
}
