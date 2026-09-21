import { useState } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { AxiosError } from 'axios'
import { KeyRound, ArrowLeft, Eye, EyeOff, Mail } from 'lucide-react'
import { AuthCard } from './AuthCard'
import { Input, Button, Alert } from '../../components/ui'
import { apiClient, API_ENDPOINTS, normalizeApiError, setAuthTokens } from '../../api'
import { useAppDispatch } from '../../store/hooks'
import { setUser, type AuthUser } from '../../store/slices/authSlice'

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters' })
      .max(128, { message: 'Password cannot exceed 128 characters' }),
    confirmPassword: z
      .string()
      .min(1, { message: 'Please confirm your new password' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetFormValues = z.infer<typeof resetSchema>

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const locationState = location.state as { email?: string; otp?: string; token?: string } | null
  const email = (searchParams.get('email') || locationState?.email || '').trim().toLowerCase()
  const otpOrToken = (searchParams.get('otp') || searchParams.get('token') || locationState?.otp || locationState?.token || '').trim()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (values: ResetFormValues) => {
    if (!email || !otpOrToken) {
      setServerError('Verification session missing or expired. Please verify your OTP code first.')
      return
    }

    try {
      setServerError(null)
      // Call backend reset password endpoint which sets cookies and returns auth tokens
      const response = await apiClient.post<{
        message: string
        access_token?: string
        user: AuthUser
      }>(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        email,
        token_or_otp: otpOrToken,
        password: values.password,
      })

      // Store tokens if present
      if (response.data?.access_token) {
        setAuthTokens({
          accessToken: response.data.access_token,
        })
      }

      // Update Redux state
      if (response.data?.user) {
        dispatch(setUser(response.data.user))
      }

      // Automatically logged in -> directly navigate to dashboard
      navigate('/', { replace: true })
    } catch (err) {
      const apiErr = normalizeApiError(err as AxiosError)
      setServerError(apiErr.message)
    }
  }

  return (
    <AuthCard
      title="Set New Password"
      subtitle="Enter a secure new password for your account."
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
          {(!email || !otpOrToken) && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Missing verification code.{' '}
              <Link to="/forgot-password" className="underline font-medium">
                Start password reset here
              </Link>
            </p>
          )}
        </div>

        {/* New Password */}
        <Input
          label="New Password"
          type={showPassword ? 'text' : 'password'}
          required
          placeholder="Enter new password (min 8 characters)"
          error={errors.password?.message}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          {...register('password')}
        />

        {/* Confirm New Password */}
        <Input
          label="Confirm New Password"
          type={showConfirmPassword ? 'text' : 'password'}
          required
          placeholder="Confirm new password"
          error={errors.confirmPassword?.message}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              title={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          {...register('confirmPassword')}
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          disabled={!email || !otpOrToken}
          leftIcon={<KeyRound className="w-4 h-4" />}
          className="w-full"
        >
          {isSubmitting ? 'Saving Password...' : 'Reset Password & Sign In'}
        </Button>
      </form>
    </AuthCard>
  )
}
export default ResetPasswordPage
