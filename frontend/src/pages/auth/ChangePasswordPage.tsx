import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { AuthCard } from './AuthCard'

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Current password is required' }),
    newPassword: z.string().min(8, { message: 'New password must be at least 8 characters' }),
    confirmNewPassword: z.string().min(1, { message: 'Please confirm your new password' }),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  })

type ChangePasswordValues = z.infer<typeof changePasswordSchema>

export const ChangePasswordPage = () => {
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  })

  const onSubmit = () => {
    setSuccess(true)
    reset()
    setTimeout(() => setSuccess(false), 5000)
  }

  return (
    <AuthCard
      title="Change Password"
      subtitle="Update your account password for continued security."
      footer={
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      }
    >
      {success && (
        <div className="mb-5 p-3.5 rounded-lg bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-800/60 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
          <span>Password changed successfully. Your active session is secure.</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Current Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Current Password
          </label>
          <input
            type="password"
            placeholder="Enter current password"
            {...register('currentPassword')}
            className={`w-full h-10 px-3.5 rounded-lg border bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition duration-150 ease-in-out focus:outline-none focus:ring-2 ${
              errors.currentPassword
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20'
            }`}
          />
          {errors.currentPassword && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{errors.currentPassword.message}</p>
          )}
        </div>

        {/* New Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            New Password
          </label>
          <input
            type="password"
            placeholder="Enter new password"
            {...register('newPassword')}
            className={`w-full h-10 px-3.5 rounded-lg border bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition duration-150 ease-in-out focus:outline-none focus:ring-2 ${
              errors.newPassword
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20'
            }`}
          />
          {errors.newPassword && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{errors.newPassword.message}</p>
          )}
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Confirm New Password
          </label>
          <input
            type="password"
            placeholder="Confirm new password"
            {...register('confirmNewPassword')}
            className={`w-full h-10 px-3.5 rounded-lg border bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition duration-150 ease-in-out focus:outline-none focus:ring-2 ${
              errors.confirmNewPassword
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20'
            }`}
          />
          {errors.confirmNewPassword && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{errors.confirmNewPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition duration-150 ease-in-out shadow-sm cursor-pointer inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
        >
          <KeyRound className="w-4 h-4" />
          <span>{isSubmitting ? 'Saving...' : 'Update Password'}</span>
        </button>
      </form>
    </AuthCard>
  )
}
