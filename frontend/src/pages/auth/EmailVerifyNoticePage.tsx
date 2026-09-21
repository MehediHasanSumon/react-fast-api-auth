import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, RefreshCw, ArrowLeft } from 'lucide-react'
import { AuthCard } from './AuthCard'

export const EmailVerifyNoticePage = () => {
  const [resent, setResent] = useState(false)

  const handleResend = () => {
    setResent(true)
    setTimeout(() => setResent(false), 5000)
  }

  return (
    <AuthCard
      title="Verify Your Email Address"
      subtitle="A verification link has been dispatched to your email."
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
      <div className="text-center py-3">
        <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-7 h-7" />
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
          Before getting started, please verify your email address by clicking on the link we just emailed to you. If you didn't receive the email, we will gladly send you another.
        </p>

        {resent && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-800/60 text-xs font-medium text-green-700 dark:text-green-400">
            A new verification link has been sent to your email address.
          </div>
        )}

        <button
          type="button"
          onClick={handleResend}
          className="w-full h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition duration-150 ease-in-out shadow-sm cursor-pointer inline-flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Resend Verification Email</span>
        </button>
      </div>
    </AuthCard>
  )
}
