import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { AxiosError } from 'axios'
import { Mail, ArrowLeft } from 'lucide-react'
import { AuthCard } from './AuthCard'
import { Input, Button, Alert } from '../../components/ui'
import { apiClient, API_ENDPOINTS, normalizeApiError } from '../../api'

const forgotSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Enter email address' })
    .email({ message: 'Enter a valid email address (e.g. name@example.com)' }),
})

type ForgotFormValues = z.infer<typeof forgotSchema>

export const ForgotPasswordPage = () => {
  const [serverError, setServerError] = useState<string | null>(null)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: ForgotFormValues) => {
    try {
      setServerError(null)
      const cleanEmail = values.email.trim().toLowerCase()
      await apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        email: cleanEmail,
      })
      navigate(`/verify-otp?email=${encodeURIComponent(cleanEmail)}`, {
        state: { email: cleanEmail },
      })
    } catch (err) {
      const apiErr = normalizeApiError(err as AxiosError)
      setServerError(apiErr.message)
    }
  }


  return (
    <AuthCard
      title="Forgot Password?"
      subtitle="Enter your verified work email address to receive your 6-digit verification code."
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

        <Input
          label="Email Address"
          type="email"
          required
          placeholder="Enter email address"
          error={errors.email?.message}
          {...register('email')}
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          leftIcon={<Mail className="w-4 h-4" />}
          className="w-full"
        >
          {isSubmitting ? 'Sending verification code...' : 'Send OTP Code'}
        </Button>
      </form>
    </AuthCard>
  )
}

