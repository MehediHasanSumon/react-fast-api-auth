import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil } from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import { http } from '../../api/client'
import { API_ENDPOINTS } from '../../api/endpoints'
import type { ApiErrorDetail } from '../../api/types'
import type { UserRecord, UserRole, Department, UserStatus } from '../../data/mockUsers'

const editUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter full name (at least 2 characters)')
    .max(100, 'Full name cannot exceed 100 characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Enter email address')
    .email('Enter a valid email address (e.g. user@example.com)'),
  mobile_number: z
    .string()
    .trim()
    .min(7, 'Enter contact number (at least 7 digits)')
    .max(20, 'Contact number cannot exceed 20 digits')
    .regex(/^[0-9+()\- ]+$/, 'Enter a valid contact number (digits, +, -, parentheses)'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password cannot exceed 128 characters'),
  status: z.enum(['Active', 'Inactive', 'Suspended'] as const, {
    message: 'Select an account status',
  }),
  is_verified: z.enum(['true', 'false'] as const, {
    message: 'Select a verification status',
  }),
})

type EditUserFormValues = z.infer<typeof editUserSchema>

export interface EditUserModalProps {
  user: UserRecord | null
  isOpen: boolean
  onClose: () => void
  onUserUpdated: (user: UserRecord) => void
}

interface BackendUserUpdatedResponse {
  id: string
  name: string
  email: string
  mobile_number: string | null
  avatar: string | null
  role: string
  department: string
  status: string
  is_verified: boolean
  created_at: string | null
  updated_at: string | null
}

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Suspended', label: 'Suspended' },
]

const VERIFIED_OPTIONS: { value: 'true' | 'false'; label: string }[] = [
  { value: 'true', label: 'Verified' },
  { value: 'false', label: 'Unverified' },
]

export const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  isOpen,
  onClose,
  onUserUpdated,
}) => {
  const [serverError, setServerError] = useState<string | null>(null)
  const [availableRoles, setAvailableRoles] = useState<{ id: string; name: string }[]>([])
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set())

  // Load available roles and user's assigned roles
  useEffect(() => {
    if (!user || !isOpen) return
    let isMounted = true

    const loadRoleData = async () => {
      try {
        const [rolesRes, userRolesRes] = await Promise.all([
          http.get<{ roles: { id: string; name: string }[] }>(API_ENDPOINTS.ROLES.LIST, {
            params: { limit: 50 },
          }),
          http.get<{ id: string; name: string }[]>(`/users/${user.id}/roles`).catch(() => []),
        ])

        if (!isMounted) return
        if (rolesRes?.roles) {
          setAvailableRoles(rolesRes.roles)
        }
        if (Array.isArray(userRolesRes)) {
          setSelectedRoleIds(new Set(userRolesRes.map((r: { id: string }) => r.id)))
        }
      } catch {
        // Silently continue
      }
    }

    loadRoleData()

    return () => {
      isMounted = false
    }
  }, [user, isOpen])

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev)
      if (next.has(roleId)) {
        next.delete(roleId)
      } else {
        next.add(roleId)
      }
      return next
    })
  }

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    mode: 'onTouched',
  })

  // Pre-fill form when user changes or modal opens
  useEffect(() => {
    if (user && isOpen) {
      reset({
        name: user.name,
        email: user.email,
        mobile_number: user.phoneNumber || '',
        password: '',
        status: user.status,
        is_verified: user.isVerified ? 'true' : 'false',
      })
    }
  }, [user, isOpen, reset])

  if (!user) return null

  const handleFormSubmit = async (data: EditUserFormValues) => {
    setServerError(null)

    const isVerifiedBool = data.is_verified === 'true'
    const backendStatus =
      data.status === 'Active'
        ? 'active'
        : data.status === 'Inactive'
        ? 'deactived'
        : 'blocked'

    const payload: Record<string, unknown> = {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      mobile_number: data.mobile_number.trim(),
      password: data.password.trim(),
      status: backendStatus,
      is_verified: isVerifiedBool,
      role_ids: Array.from(selectedRoleIds),
    }

    try {
      const updated = await http.put<BackendUserUpdatedResponse>(
        API_ENDPOINTS.USERS.UPDATE(user.id),
        payload
      )

      const updatedRecord: UserRecord = {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: (updated.role as UserRole) || user.role,
        department: (updated.department as Department) || user.department,
        status: data.status,
        phoneNumber: updated.mobile_number || undefined,
        isVerified: updated.is_verified,
        lastActive: user.lastActive || 'Just now',
        joinedDate: updated.created_at ? updated.created_at.split('T')[0] : user.joinedDate,
      }

      onUserUpdated(updatedRecord)
      handleModalClose()
    } catch (err: unknown) {
      const apiErr = err as ApiErrorDetail
      let mappedField = false

      if (apiErr?.errors) {
        Object.entries(apiErr.errors).forEach(([field, msgs]) => {
          if (field in data) {
            setError(field as keyof EditUserFormValues, {
              type: 'server',
              message: msgs[0],
            })
            mappedField = true
          }
        })
      }

      // Smart conflict / duplicate mapping for HTTP 409 or specific server detail messages
      const msgLower = (apiErr?.message || '').toLowerCase()
      if (msgLower.includes('email') && (msgLower.includes('already exists') || msgLower.includes('registered'))) {
        setError('email', {
          type: 'server',
          message: apiErr.message,
        })
        mappedField = true
      } else if (
        (msgLower.includes('phone') || msgLower.includes('mobile')) &&
        (msgLower.includes('already registered') || msgLower.includes('already exists'))
      ) {
        setError('mobile_number', {
          type: 'server',
          message: apiErr.message,
        })
        mappedField = true
      }

      if (!mappedField) {
        setServerError(apiErr?.message || 'Failed to update user account. Please check inputs.')
      }
    }
  }

  const handleModalClose = () => {
    setServerError(null)
    reset()
    onClose()
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Edit User Account"
      description={`Update profile details and account status for ${user.name}.`}
      icon={<Pencil className="w-5 h-5" />}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-1">
        {serverError && (
          <Alert variant="danger" onClose={() => setServerError(null)}>
            {serverError}
          </Alert>
        )}

        {/* Row 1: Name & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            required
            placeholder="Enter full name"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Email Address"
            type="email"
            required
            placeholder="Enter email address"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        {/* Row 2: Mobile Number & Password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Mobile Number"
            type="tel"
            required
            placeholder="Enter mobile number"
            error={errors.mobile_number?.message}
            {...register('mobile_number')}
          />

          <Input
            label="Password"
            type="password"
            required
            placeholder="Enter password"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        {/* Row 3: Account Status & Verification Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Account Status"
            required
            options={STATUS_OPTIONS}
            error={errors.status?.message}
            {...register('status')}
          />

          <Select
            label="Verification Status"
            required
            options={VERIFIED_OPTIONS}
            error={errors.is_verified?.message}
            {...register('is_verified')}
          />
        </div>

        {/* Row 4: Multi-Role Assignment */}
        {availableRoles.length > 0 && (
          <div className="space-y-1.5 text-left">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 select-none">
              Assign Roles
              <span className="text-gray-400 dark:text-gray-500 font-normal ml-1 text-xs">
                (Optional)
              </span>
            </label>
            <div className="flex flex-wrap gap-2 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40">
              {availableRoles.map((r) => {
                const isSelected = selectedRoleIds.has(r.id)
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRole(r.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <span>{r.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="secondary" onClick={handleModalClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            leftIcon={<Pencil className="w-4 h-4" />}
          >
            {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
