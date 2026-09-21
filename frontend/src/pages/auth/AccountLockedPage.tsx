import { Link } from 'react-router-dom'
import { ShieldAlert, LifeBuoy, ArrowLeft } from 'lucide-react'
import { AuthCard } from './AuthCard'

export const AccountLockedPage = () => {
  return (
    <AuthCard
      title="Account Temporarily Locked"
      subtitle="For account and data security, your access has been suspended."
      icon={
        <div className="w-12 h-12 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
      }
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sign In</span>
        </Link>
      }
    >
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-red-50/70 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-800 dark:text-red-300 leading-relaxed">
          Too many consecutive invalid password attempts were detected. Your account has been temporarily locked for <strong>15 minutes</strong> to prevent unauthorized access.
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>You can:</p>
          <ul className="list-disc list-inside space-y-1 text-xs text-gray-500 dark:text-gray-400">
            <li>Wait for the 15-minute cooling period to complete.</li>
            <li>Use the password recovery flow to regain access immediately.</li>
            <li>Contact your system administrator or helpdesk.</li>
          </ul>
        </div>

        <div className="pt-2 space-y-3">
          <Link
            to="/forgot-password"
            className="w-full h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition duration-150 ease-in-out shadow-sm cursor-pointer inline-flex items-center justify-center"
          >
            Reset Your Password
          </Link>

          <a
            href="mailto:support@example.com"
            className="w-full h-10 px-4 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium transition duration-150 ease-in-out cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <LifeBuoy className="w-4 h-4" />
            <span>Contact IT Support</span>
          </a>
        </div>
      </div>
    </AuthCard>
  )
}
