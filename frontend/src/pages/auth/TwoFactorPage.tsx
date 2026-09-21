import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import { AuthCard } from './AuthCard'

const twoFactorSchema = z.object({
  code: z
    .string()
    .length(6, { message: 'Authentication code must be 6 digits' })
    .regex(/^\d{6}$/, { message: 'Code must contain only digits' }),
})

type TwoFactorFormValues = z.infer<typeof twoFactorSchema>

export const TwoFactorPage = () => {
  const [useRecovery, setUseRecovery] = useState(false)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TwoFactorFormValues>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: { code: '' },
  })

  const onSubmit = () => {
    navigate('/')
  }

  return (
    <AuthCard
      title="Two-Factor Authentication"
      subtitle="Open your two-factor authenticator app on your device to view your authentication code."
      icon={
        <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {useRecovery ? 'Emergency Recovery Code' : '6-Digit Authenticator Code'}
          </label>
          <input
            type="text"
            maxLength={6}
            placeholder={useRecovery ? 'Enter recovery code' : 'Enter 6-digit security code'}
            {...register('code')}
            className={`w-full h-11 px-3.5 text-center text-lg tracking-widest font-mono rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-sm placeholder:tracking-normal placeholder:font-sans transition duration-150 ease-in-out focus:outline-none focus:ring-2 ${
              errors.code
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20'
            }`}
          />
          {errors.code && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium text-center">{errors.code.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition duration-150 ease-in-out shadow-sm cursor-pointer inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{isSubmitting ? 'Verifying...' : 'Verify Code'}</span>
        </button>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setUseRecovery(!useRecovery)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium cursor-pointer transition"
          >
            {useRecovery ? 'Use authenticator app code instead' : 'Lost access to device? Use recovery code'}
          </button>
        </div>
      </form>
    </AuthCard>
  )
}
