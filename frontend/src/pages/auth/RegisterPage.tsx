import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { AxiosError } from 'axios'
import { UserPlus } from 'lucide-react'
import { AuthCard } from './AuthCard'
import { Input, Checkbox, Button, Alert } from '../../components/ui'
import { apiClient, API_ENDPOINTS, normalizeApiError, setAuthTokens } from '../../api'
import { useAppDispatch } from '../../store/hooks'
import { setUser, type AuthUser } from '../../store/slices/authSlice'

const registerSchema = z
  .object({
    fullName: z.string().min(3, { message: 'Full name must be at least 3 characters' }),
    email: z.string().min(1, { message: 'Email address is required' }).email({ message: 'Enter a valid email address' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
    confirmPassword: z.string().min(1, { message: 'Please confirm your password' }),
    acceptTerms: z.literal(true, {
      message: 'You must accept the terms of service',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export const RegisterPage = () => {
  const [serverError, setServerError] = useState<string | null>(null)
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      setServerError(null)
      const response = await apiClient.post<{
        message: string
        user?: AuthUser
        access_token?: string
      }>(API_ENDPOINTS.AUTH.REGISTER, {
        name: values.fullName,
        email: values.email,
        password: values.password,
      })

      if (response.data?.access_token) {
        setAuthTokens({
          accessToken: response.data.access_token,
        })
      }

      if (response.data?.user) {
        dispatch(setUser(response.data.user))
      }

      navigate('/dashboard', { replace: true })
    } catch (err) {
      const apiErr = normalizeApiError(err as AxiosError)
      if (apiErr.errors) {
        Object.entries(apiErr.errors).forEach(([field, msgs]) => {
          const formField = field === 'name' ? 'fullName' : field
          if (formField === 'fullName' || formField === 'email' || formField === 'password') {
            setError(formField, { message: msgs[0] })
          }
        })
      }
      setServerError(apiErr.message)
    }
  }

  return (
    <AuthCard
      title="Create Staff Account"
      subtitle="Register a new staff or physician account for the portal."
      footer={
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition cursor-pointer"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <Alert variant="danger" onClose={() => setServerError(null)}>
            {serverError}
          </Alert>
        )}

        {/* Full Name */}
        <Input
          label="Full Name"
          required
          placeholder="Enter full name"
          error={errors.fullName?.message}
          {...register('fullName')}
        />

        {/* Email */}
        <Input
          label="Email Address"
          type="email"
          required
          placeholder="Enter email address"
          error={errors.email?.message}
          {...register('email')}
        />

        {/* Password */}
        <Input
          label="Password"
          type="password"
          required
          placeholder="Enter password"
          helperText="Must be at least 6 characters"
          error={errors.password?.message}
          {...register('password')}
        />

        {/* Confirm Password */}
        <Input
          label="Confirm Password"
          type="password"
          required
          placeholder="Confirm password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {/* Terms */}
        <Checkbox
          id="acceptTerms"
          required
          label="I agree to the security policy and terms of service."
          error={errors.acceptTerms?.message}
          {...register('acceptTerms')}
        />

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          leftIcon={<UserPlus className="w-4 h-4" />}
          className="w-full"
        >
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>
    </AuthCard>
  )
}
