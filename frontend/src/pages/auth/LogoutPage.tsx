import { Link } from 'react-router-dom'
import { LogOut, ArrowRight, ShieldCheck } from 'lucide-react'
import { AuthCard } from './AuthCard'

export const LogoutPage = () => {
  return (
    <AuthCard
      title="You Have Been Logged Out"
      subtitle="Your active session has been securely terminated."
      icon={
        <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center">
          <LogOut className="w-6 h-6" />
        </div>
      }
    >
      <div className="text-center py-2 space-y-6">
        <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 text-left">
          <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
          <span>All session records and temporary browser cache have been cleared safely.</span>
        </div>

        <div className="space-y-3">
          <Link
            to="/login"
            className="w-full h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition duration-150 ease-in-out shadow-sm cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <span>Sign In Again</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/"
            className="w-full h-10 px-4 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium transition duration-150 ease-in-out cursor-pointer inline-flex items-center justify-center"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </AuthCard>
  )
}
