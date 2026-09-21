import { useState } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { AxiosError } from 'axios'
import { KeySquare, ArrowLeft, RefreshCw, Mail } from 'lucide-react'
import { AuthCard } from './AuthCard'
import { Input, Button, Alert } from '../../components/ui'
import { apiClient, API_ENDPOINTS, normalizeApiError } from '../../api'

const otpSchema = z.object({
  otp: z
    .string()
    .trim()
    .length(6, { message: 'OTP must be exactly 6 digits' })
    .regex(/^\d{6}$/, { message: 'OTP must contain only numbers' }),
})

type OtpFormValues = z.infer<typeof otpSchema>

export const VerifyOtpPage = () => {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  const email = (
    searchParams.get('email') ||
    (location.state as { email?: string })?.email ||
    ''
  ).trim().toLowerCase()

  const initialOtp = (searchParams.get('otp') || '').trim()

  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: initialOtp,
    },
  })

  const onSubmit = async (values: OtpFormValues) => {
    if (!email) {
      setServerError('Email address missing. Please request a new verification code.')
      return
    }

    try {
      setServerError(null)
      // Verify OTP code with backend
      await apiClient.post(API_ENDPOINTS.AUTH.VERIFY_RESET_TOKEN, {
        email,
        token_or_otp: values.otp.trim(),
      })

      // If correct, navigate to Set New Password page
      navigate(`/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(values.otp.trim())}`, {
        state: { email, otp: values.otp.trim() },
      })
    } catch (err) {
      const apiErr = normalizeApiError(err as AxiosError)
      setServerError(apiErr.message || 'Invalid or expired OTP code. Please check your email or resend.')
    }
  }

  const handleResend = async () => {
    if (!email) {
      navigate('/forgot-password')
      return
    }

    setResending(true)
    setServerError(null)
    setResendSuccess(null)

    try {
      await apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email })
      setResendSuccess('A fresh 6-digit verification code has been sent to your email.')
      setTimeout(() => setResendSuccess(null), 5000)
    } catch (err) {
      const apiErr = normalizeApiError(err as AxiosError)
      setServerError(apiErr.message)
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthCard
      title="Verify OTP Code"
      subtitle="Enter the 6-digit verification code sent to your email address."
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
        {serverError && (
          <Alert variant="danger" onClose={() => setServerError(null)}>
            {serverError}
          </Alert>
        )}

        {resendSuccess && (
          <Alert variant="success" onClose={() => setResendSuccess(null)}>
            {resendSuccess}
          </Alert>
        )}

        {/* Email Address Display */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Email Address
          </label>
          <Input
            type="email"
            value={email || 'No email provided'}
            disabled
            leftIcon={<Mail className="w-4 h-4 text-gray-400" />}
            className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          />
          {!email && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Email address is required.{' '}
              <Link to="/forgot-password" className="underline font-medium">
                Enter your email here
              </Link>
            </p>
          )}
        </div>

        {/* 6-Digit OTP Code Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            6-Digit Verification Code (OTP) <span className="text-red-600 dark:text-red-400">*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter 6-digit OTP code"
            {...register('otp')}
            className={`w-full h-12 px-3.5 text-center text-2xl tracking-[0.3em] font-mono rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-sm placeholder:tracking-normal placeholder:font-sans transition duration-150 ease-in-out focus:outline-none focus:ring-2 ${
              errors.otp
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20'
            }`}
          />
          {errors.otp && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium text-center">
              {errors.otp.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          leftIcon={<KeySquare className="w-4 h-4" />}
          className="w-full"
        >
          {isSubmitting ? 'Verifying Code...' : 'Verify & Continue'}
        </Button>

        <div className="text-center pt-1">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            <span>{resending ? 'Sending new code...' : "Didn't receive code? Resend"}</span>
          </button>
        </div>
      </form>
    </AuthCard>
  )
}
export default VerifyOtpPage
