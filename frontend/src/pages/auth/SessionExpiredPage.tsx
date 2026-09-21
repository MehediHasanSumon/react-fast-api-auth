import { Link } from 'react-router-dom'
import { Clock, LogIn } from 'lucide-react'
import { AuthCard } from './AuthCard'

export const SessionExpiredPage = () => {
  return (
    <AuthCard
      title="Session Expired"
      subtitle="Your active session has timed out due to inactivity."
      icon={
        <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <Clock className="w-6 h-6" />
        </div>
      }
    >
      <div className="space-y-5">
        <div className="p-3.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          Data security policies automatically end inactive sessions to protect your account. Please log in again to continue your work.
        </div>

        <Link
          to="/login"
          className="w-full h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition duration-150 ease-in-out shadow-sm cursor-pointer inline-flex items-center justify-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          <span>Log In Again</span>
        </Link>
      </div>
    </AuthCard>
  )
}
