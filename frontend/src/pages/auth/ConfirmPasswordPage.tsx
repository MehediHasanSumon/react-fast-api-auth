import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LockKeyhole, ShieldAlert } from 'lucide-react'
import { AuthCard } from './AuthCard'

const confirmSchema = z.object({
  password: z.string().min(1, { message: 'Password confirmation is required' }),
})

type ConfirmFormValues = z.infer<typeof confirmSchema>

export const ConfirmPasswordPage = () => {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmFormValues>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { password: '' },
  })

  const onSubmit = () => {
    navigate(-1)
  }

  return (
    <AuthCard
      title="Confirm Your Password"
      subtitle="This is a secure area of the system. Please confirm your password before continuing."
      icon={
        <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <LockKeyhole className="w-6 h-6" />
        </div>
      }
    >
      <div className="mb-4 p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <span>For enhanced account security, sensitive actions require password re-verification.</span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Current Password
          </label>
          <input
            type="password"
            placeholder="Enter password"
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

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="h-10 px-4 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition duration-150 ease-in-out shadow-sm cursor-pointer inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
          >
            <span>Confirm Password</span>
          </button>
        </div>
      </form>
    </AuthCard>
  )
}
