import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { AxiosError } from 'axios'
import { LogIn, Eye, EyeOff } from 'lucide-react'
import { AuthCard } from './AuthCard'
import { Input, Checkbox, Button, Alert } from '../../components/ui'
import { apiClient, API_ENDPOINTS, normalizeApiError, setAuthTokens } from '../../api'
import { useAppDispatch } from '../../store/hooks'
import { setUser, type AuthUser } from '../../store/slices/authSlice'

const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, { message: 'Enter email address or mobile number' })
    .refine(
      (val) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const phoneRegex = /^[0-9+()\- ]{7,20}$/
        return emailRegex.test(val.trim()) || phoneRegex.test(val.trim())
      },
      { message: 'Enter a valid email address or contact number' }
    ),
  password: z.string().min(1, { message: 'Password is required' }),
  rememberMe: z.boolean().optional(),
})

type LoginFormValues = z.infer<typeof loginSchema>

export const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()

  const locationState = location.state as { from?: Location; reason?: string } | null
  const redirectReason = locationState?.reason || new URLSearchParams(location.search).get('reason')

  const [sessionNotice, setSessionNotice] = useState<string | null>(() => {
    if (redirectReason === 'user_removed') {
      return 'Your account has been deleted or deactivated. Please contact an administrator.'
    }
    if (redirectReason === 'user_blocked') {
      return 'Your account has been suspended or blocked. Please contact an administrator.'
    }
    return null
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
      rememberMe: false,
    },
  })

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setServerError(null)
      const response = await apiClient.post<{
        message: string
        user?: AuthUser
        access_token?: string
      }>(API_ENDPOINTS.AUTH.LOGIN, {
        email: values.identifier.trim(),
        password: values.password,
        remember_me: values.rememberMe,
      })

      if (response.data?.access_token) {
        setAuthTokens({
          accessToken: response.data.access_token,
        })
      }

      if (response.data?.user) {
        dispatch(setUser(response.data.user))
      }

      const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch (err) {
      const apiErr = normalizeApiError(err as AxiosError)
      setServerError(apiErr.message)
    }
  }

  return (
    <AuthCard
      title="Sign In to Portal"
      subtitle="Enter your credentials to access your workspace."
      footer={
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition cursor-pointer"
          >
            Create account
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {sessionNotice && !serverError && (
          <Alert variant="danger" onClose={() => setSessionNotice(null)}>
            <div>{sessionNotice}</div>
          </Alert>
        )}

        {serverError && (
          <Alert variant="danger" onClose={() => setServerError(null)}>
            <div>{serverError}</div>
            {serverError.toLowerCase().includes('locked') && (
              <div className="mt-1.5 pt-1.5 border-t border-red-200/60 dark:border-red-800/60">
                <Link
                  to="/forgot-password"
                  className="font-medium underline hover:text-red-900 dark:hover:text-red-200 inline-flex items-center gap-1"
                >
                  Click here to reset your password and unlock account
                </Link>
              </div>
            )}
          </Alert>
        )}

        {/* Email or Mobile Number */}
        <Input
          label="Email Address or Mobile Number"
          type="text"
          required
          placeholder="Enter email address or mobile number"
          error={errors.identifier?.message}
          {...register('identifier')}
        />

        {/* Password */}
        <div className="text-left">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition cursor-pointer"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter password"
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
        </div>

        {/* Remember Me */}
        <Checkbox
          id="rememberMe"
          label="Remember this device for 30 days"
          {...register('rememberMe')}
        />

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          leftIcon={<LogIn className="w-4 h-4" />}
          className="w-full"
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </AuthCard>
  )
}
