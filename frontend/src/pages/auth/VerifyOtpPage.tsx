import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { KeySquare, ArrowLeft, RefreshCw } from 'lucide-react'
import { AuthCard } from './AuthCard'

const otpSchema = z.object({
  otp: z
    .string()
    .length(6, { message: 'OTP must be exactly 6 digits' })
    .regex(/^\d{6}$/, { message: 'OTP must contain only numbers' }),
})

type OtpFormValues = z.infer<typeof otpSchema>

export const VerifyOtpPage = () => {
  const [resending, setResending] = useState(false)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  })

  const onSubmit = () => {
    navigate('/')
  }

  const handleResend = () => {
    setResending(true)
    setTimeout(() => setResending(false), 2000)
  }

  return (
    <AuthCard
      title="Verify One-Time Password"
      subtitle="Enter the 6-digit verification code sent to your registered phone or email."
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Security Code (OTP)
          </label>
          <input
            type="text"
            maxLength={6}
            placeholder="Enter 6-digit OTP code"
            {...register('otp')}
            className={`w-full h-12 px-3.5 text-center text-xl tracking-widest font-mono rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-sm placeholder:tracking-normal placeholder:font-sans transition duration-150 ease-in-out focus:outline-none focus:ring-2 ${
              errors.otp
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20'
            }`}
          />
          {errors.otp && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium text-center">{errors.otp.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition duration-150 ease-in-out shadow-sm cursor-pointer inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
        >
          <KeySquare className="w-4 h-4" />
          <span>{isSubmitting ? 'Verifying...' : 'Verify & Continue'}</span>
        </button>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            <span>{resending ? 'Resending code...' : "Didn't receive code? Resend"}</span>
          </button>
        </div>
      </form>
    </AuthCard>
  )
}
