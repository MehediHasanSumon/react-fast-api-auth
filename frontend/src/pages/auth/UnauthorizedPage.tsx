import { Link, useNavigate } from 'react-router-dom'
import { ShieldX, Home, ArrowLeft } from 'lucide-react'
import { AuthCard } from './AuthCard'

export const UnauthorizedPage = () => {
  const navigate = useNavigate()

  return (
    <AuthCard
      title="Access Restricted"
      subtitle="You do not have the required permissions to view this system module."
      icon={
        <div className="w-12 h-12 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center">
          <ShieldX className="w-6 h-6" />
        </div>
      }
    >
      <div className="space-y-5">
        <div className="p-3.5 rounded-lg bg-red-50/70 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-800 dark:text-red-300 leading-relaxed">
          Your current user role does not possess authorization for this specific module or resource. Please contact your system administrator if you require access.
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-1/2 h-10 px-4 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium transition duration-150 ease-in-out cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>

          <Link
            to="/"
            className="w-full sm:w-1/2 h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition duration-150 ease-in-out shadow-sm cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </AuthCard>
  )
}
