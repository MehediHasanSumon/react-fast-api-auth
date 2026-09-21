import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { AuthCard } from './AuthCard'

const forgotSchema = z.object({
  email: z.string().min(1, { message: 'Email address is required' }).email({ message: 'Enter a valid email address' }),
})

type ForgotFormValues = z.infer<typeof forgotSchema>

export const ForgotPasswordPage = () => {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = () => {
    setSubmitted(true)
  }

  return (
    <AuthCard
      title="Forgot Password?"
      subtitle="Enter your verified work email address to receive password recovery instructions."
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
      {submitted ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-800/60 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Reset Link Sent</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            If an account exists with this email, you will receive a secure password reset link shortly.
          </p>
          <Link
            to="/reset-password"
            className="inline-flex items-center justify-center h-10 px-4 w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition cursor-pointer"
          >
            Enter New Password
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter email address"
              {...register('email')}
              className={`w-full h-10 px-3.5 rounded-lg border bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition duration-150 ease-in-out focus:outline-none focus:ring-2 ${
                errors.email
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20'
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition duration-150 ease-in-out shadow-sm cursor-pointer inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
          >
            <Mail className="w-4 h-4" />
            <span>{isSubmitting ? 'Sending link...' : 'Send Reset Link'}</span>
          </button>
        </form>
      )}
    </AuthCard>
  )
}
