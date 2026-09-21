import { Link } from 'react-router-dom'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { AuthCard } from './AuthCard'

export const VerifyEmailPage = () => {
  return (
    <AuthCard
      title="Email Verified Successfully"
      subtitle="Your work email address has been confirmed and verified."
    >
      <div className="text-center py-4">
        <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-800/60 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7" />
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
          Thank you for verifying your email address. Your account is now active with full system privileges.
        </p>

        <Link
          to="/login"
          className="w-full h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition duration-150 ease-in-out shadow-sm cursor-pointer inline-flex items-center justify-center gap-2"
        >
          <span>Continue to Sign In</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </AuthCard>
  )
}
