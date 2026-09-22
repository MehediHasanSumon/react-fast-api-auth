import React, { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { AxiosError } from 'axios'
import {
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  Camera,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { updateUserProfile } from '../store/slices/authSlice'
import { apiClient, API_ENDPOINTS, normalizeApiError } from '../api'
import { getAvatarUrl } from '../utils/avatar'
import { Input, Button, Alert, Badge } from '../components/ui'

// 1. Personal Information Validation Schema
const personalInfoSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Enter full name (at least 2 characters)' })
    .max(100, { message: 'Name cannot exceed 100 characters' }),
  mobile_number: z
    .string()
    .trim()
    .min(1, { message: 'Enter contact number' })
    .regex(/^[0-9+()\- ]{7,20}$/, {
      message: 'Enter a valid contact number (7 to 20 digits)',
    }),
})

type PersonalInfoValues = z.infer<typeof personalInfoSchema>

// 2. Change Password Validation Schema
const passwordSchema = z
  .object({
    current_password: z.string().min(1, { message: 'Current password is required' }),
    new_password: z
      .string()
      .min(8, { message: 'New password must be at least 8 characters' })
      .max(128, { message: 'Password cannot exceed 128 characters' }),
    confirm_new_password: z
      .string()
      .min(1, { message: 'Please confirm your new password' }),
  })
  .refine((data) => data.new_password === data.confirm_new_password, {
    message: 'New passwords do not match',
    path: ['confirm_new_password'],
  })

type PasswordFormValues = z.infer<typeof passwordSchema>

export const ProfilePage: React.FC = () => {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null)

  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Personal Info Form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
  } = useForm<PersonalInfoValues>({
    resolver: zodResolver(personalInfoSchema),
    values: {
      name: user?.name || '',
      mobile_number: user?.mobile_number || '',
    },
  })

  // Password Form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_new_password: '',
    },
  })

  // Avatar Upload Handler
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarError(null)
    setAvatarSuccess(null)
    setAvatarUploading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await apiClient.post<{
        message: string
        avatar_url: string
      }>(API_ENDPOINTS.AUTH.UPLOAD_AVATAR, formData, {
        headers: {
          'Content-Type': undefined,
        },
      })

      const newAvatarUrl = response.data.avatar_url
      dispatch(updateUserProfile({ avatar: newAvatarUrl }))
      setAvatarSuccess('Profile photo updated successfully.')
      setTimeout(() => setAvatarSuccess(null), 4000)
    } catch (err) {
      const apiErr = normalizeApiError(err as AxiosError)
      const specificError =
        apiErr.errors?.file?.[0] ||
        apiErr.errors?.general?.[0] ||
        apiErr.message
      setAvatarError(specificError)
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Personal Info Submit
  const onSaveProfile = async (values: PersonalInfoValues) => {
    setProfileError(null)
    setProfileSuccess(null)

    try {
      const response = await apiClient.put<{
        name: string
        mobile_number: string
      }>(API_ENDPOINTS.AUTH.UPDATE_PROFILE, {
        name: values.name,
        mobile_number: values.mobile_number,
      })

      dispatch(
        updateUserProfile({
          name: response.data.name,
          mobile_number: response.data.mobile_number,
        })
      )
      setProfileSuccess('Profile information saved successfully.')
      setTimeout(() => setProfileSuccess(null), 4000)
    } catch (err) {
      const apiErr = normalizeApiError(err as AxiosError)
      setProfileError(apiErr.message)
    }
  }

  // Password Change Submit
  const onSavePassword = async (values: PasswordFormValues) => {
    setPasswordError(null)
    setPasswordSuccess(null)

    try {
      const response = await apiClient.post<{ message: string }>(
        API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
        {
          current_password: values.current_password,
          new_password: values.new_password,
          confirm_new_password: values.confirm_new_password,
        }
      )

      setPasswordSuccess(response.data.message || 'Password changed successfully.')
      resetPasswordForm()
      setTimeout(() => setPasswordSuccess(null), 5000)
    } catch (err) {
      const apiErr = normalizeApiError(err as AxiosError)
      setPasswordError(apiErr.message)
    }
  }

  const avatarDisplayUrl = getAvatarUrl(user?.avatar)

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your personal information, profile photo, and security credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Summary Card */}
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm text-center">
            {/* Avatar with Camera Overlay */}
            <div className="relative inline-block mx-auto mb-4">
              <div className="w-28 h-28 rounded-full border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shadow-inner">
                {avatarDisplayUrl ? (
                  <img
                    src={avatarDisplayUrl}
                    alt={user?.name || 'User avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-blue-600 dark:text-blue-400 select-none">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                )}
              </div>

              {/* Upload Trigger Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                aria-label="Change profile photo"
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white flex items-center justify-center shadow-md cursor-pointer transition disabled:opacity-50"
                title="Upload new photo"
              >
                <Camera className="w-4 h-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarSelect}
                className="hidden"
              />
            </div>

            {/* Name & Email */}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {user?.name || 'User'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 mb-3">
              {user?.email}
            </p>

            {/* Status & Role Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Badge variant={user?.status === 'active' ? 'success' : 'neutral'} dot>
                {user?.status ? user.status.toUpperCase() : 'ACTIVE'}
              </Badge>
              {user?.roles && user.roles.length > 0 ? (
                user.roles.map((r) => (
                  <Badge key={r} variant="info">
                    {r}
                  </Badge>
                ))
              ) : (
                <Badge variant="neutral">User</Badge>
              )}
            </div>

            {/* Upload Feedback */}
            {avatarUploading && (
              <p className="mt-3 text-xs text-blue-600 dark:text-blue-400 animate-pulse font-medium">
                Uploading and processing avatar...
              </p>
            )}
            {avatarSuccess && (
              <p className="mt-3 text-xs text-green-600 dark:text-green-400 font-medium">
                {avatarSuccess}
              </p>
            )}
            {avatarError && (
              <p className="mt-3 text-xs text-red-600 dark:text-red-400 font-medium">
                {avatarError}
              </p>
            )}
          </div>

          {/* Quick Security Status Card */}
          <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Security Highlights</span>
            </div>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span>Email Verification</span>
                <span className="font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Session Protection</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  HttpOnly Secure
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Personal Information & Password Change */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Personal Information */}
          <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
              <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Personal Information
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Update your contact details and display name.
                </p>
              </div>
            </div>

            {profileSuccess && (
              <Alert variant="success" onClose={() => setProfileSuccess(null)}>
                {profileSuccess}
              </Alert>
            )}
            {profileError && (
              <Alert variant="danger" onClose={() => setProfileError(null)}>
                {profileError}
              </Alert>
            )}

            <form onSubmit={handleProfileSubmit(onSaveProfile)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <Input
                  label="Full Name"
                  required
                  placeholder="Enter full name"
                  error={profileErrors.name?.message}
                  {...registerProfile('name')}
                />

                {/* Mobile Number */}
                <Input
                  label="Contact Number"
                  required
                  placeholder="Enter contact number"
                  error={profileErrors.mobile_number?.message}
                  leftIcon={<Phone className="w-4 h-4 text-gray-400" />}
                  {...registerProfile('mobile_number')}
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    leftIcon={<Mail className="w-4 h-4 text-gray-400" />}
                    className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isProfileSubmitting}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  {isProfileSubmitting ? 'Saving Changes...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </div>

          {/* Section 2: Change Password (In-Page) */}
          <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
              <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Change Password
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Ensure your account is using a secure, long password.
                </p>
              </div>
            </div>

            {passwordSuccess && (
              <Alert variant="success" onClose={() => setPasswordSuccess(null)}>
                {passwordSuccess}
              </Alert>
            )}
            {passwordError && (
              <Alert variant="danger" onClose={() => setPasswordError(null)}>
                {passwordError}
              </Alert>
            )}

            <form onSubmit={handlePasswordSubmit(onSavePassword)} className="space-y-4">
              {/* Current Password */}
              <Input
                label="Current Password"
                type={showCurrentPassword ? 'text' : 'password'}
                required
                placeholder="Enter current password"
                error={passwordErrors.current_password?.message}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                    title={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                {...registerPassword('current_password')}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* New Password */}
                <Input
                  label="New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter new password (min 8 chars)"
                  error={passwordErrors.new_password?.message}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  {...registerPassword('new_password')}
                />

                {/* Confirm New Password */}
                <Input
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Confirm new password"
                  error={passwordErrors.confirm_new_password?.message}
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
                  {...registerPassword('confirm_new_password')}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isPasswordSubmitting}
                  leftIcon={<KeyRound className="w-4 h-4" />}
                >
                  {isPasswordSubmitting ? 'Updating Password...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
export default ProfilePage
