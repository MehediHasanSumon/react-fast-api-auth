import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { AuthCard } from './AuthCard'

const resetSchema = z
  .object({
    password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
    confirmPassword: z.string().min(1, { message: 'Please confirm your new password' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetFormValues = z.infer<typeof resetSchema>

export const ResetPasswordPage = () => {
  const [completed, setCompleted] = useState(false)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = () => {
    setCompleted(true)
  }

  return (
    <AuthCard
      title="Set New Password"
      subtitle="Your new password must be at least 8 characters long."
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
      {completed ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-800/60 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Password Changed Successfully</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            You can now log in using your updated account credentials.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition cursor-pointer"
          >
            Go to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              New Password
            </label>
            <input
              type="password"
              placeholder="Enter new password"
              {...register('password')}
              className={`w-full h-10 px-3.5 rounded-lg border bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition duration-150 ease-in-out focus:outline-none focus:ring-2 ${
                errors.password
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20'
              }`}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              placeholder="Confirm new password"
              {...register('confirmPassword')}
              className={`w-full h-10 px-3.5 rounded-lg border bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition duration-150 ease-in-out focus:outline-none focus:ring-2 ${
                errors.confirmPassword
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20'
              }`}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition duration-150 ease-in-out shadow-sm cursor-pointer inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4" />
            <span>{isSubmitting ? 'Updating...' : 'Update Password'}</span>
          </button>
        </form>
      )}
    </AuthCard>
  )
}
