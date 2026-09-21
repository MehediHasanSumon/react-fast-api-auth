import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus } from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Checkbox } from '../ui/Checkbox'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import { http } from '../../api/client'
import { API_ENDPOINTS } from '../../api/endpoints'
import type { ApiErrorDetail } from '../../api/types'
import type { UserRecord, Department, UserStatus } from '../../data/mockUsers'

const createUserSchema = z.object({
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

type CreateUserFormValues = z.infer<typeof createUserSchema>

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onUserCreated: (user: UserRecord) => void
}

interface BackendUserCreatedResponse {
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

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onUserCreated,
}) => {
  const [serverError, setServerError] = useState<string | null>(null)
  const [availableRoles, setAvailableRoles] = useState<{ id: string; name: string }[]>([])
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set())

  // Load available roles
  React.useEffect(() => {
    if (!isOpen) return
    let isMounted = true
    const fetchRoles = async () => {
      try {
        const res = await http.get<{ roles: { id: string; name: string }[] }>(API_ENDPOINTS.ROLES.LIST, {
          params: { limit: 50 },
        })
        if (isMounted && res?.roles) {
          setAvailableRoles(res.roles)
        }
      } catch {
        // Silently keep empty list if roles fail to load
      }
    }
    fetchRoles()
    return () => {
      isMounted = false
    }
  }, [isOpen])

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
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      email: '',
      mobile_number: '',
      password: '',
      status: 'Active',
      is_verified: 'true',
    },
  })

  const handleFormSubmit = async (data: CreateUserFormValues) => {
    setServerError(null)

    const isVerifiedBool = data.is_verified === 'true'
    const backendStatus =
      data.status === 'Active'
        ? 'active'
        : data.status === 'Inactive'
        ? 'deactived'
        : 'blocked'

    try {
      const created = await http.post<BackendUserCreatedResponse>(API_ENDPOINTS.USERS.CREATE, {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        mobile_number: data.mobile_number.trim(),
        status: backendStatus,
        is_verified: isVerifiedBool,
        role_ids: Array.from(selectedRoleIds),
      })

      const createdRoles = availableRoles
        .filter((r) => selectedRoleIds.has(r.id))
        .map((r) => r.name)

      const newUser: UserRecord = {
        id: created.id,
        name: created.name,
        email: created.email,
        role: createdRoles.join(', ') || '—',
        roles: createdRoles,
        department: (created.department as Department) || 'Operations',
        status: data.status,
        phoneNumber: created.mobile_number || undefined,
        isVerified: created.is_verified,
        lastActive: 'Just now',
        joinedDate: created.created_at ? created.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      }

      onUserCreated(newUser)
      reset()
      setSelectedRoleIds(new Set())
      onClose()
    } catch (err: unknown) {
      const apiErr = err as ApiErrorDetail
      let mappedField = false

      if (apiErr?.errors) {
        Object.entries(apiErr.errors).forEach(([field, msgs]) => {
          if (field in data) {
            setError(field as keyof CreateUserFormValues, {
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
        setServerError(apiErr?.message || 'Failed to create user account. Please check inputs and try again.')
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
      title="Create New User Account"
      description="Provision user credentials according to system model specifications."
      icon={<UserPlus className="w-5 h-5" />}
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
          <div className="space-y-2 text-left">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 select-none">
              Assign Roles
              <span className="text-gray-400 dark:text-gray-500 font-normal ml-1 text-xs">
                (Optional)
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 max-h-48 overflow-y-auto">
              {availableRoles.map((r) => {
                const isSelected = selectedRoleIds.has(r.id)
                return (
                  <div
                    key={r.id}
                    className={`flex items-center px-3 py-2.5 rounded-lg border transition select-none ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Checkbox
                      id={`create-role-${r.id}`}
                      label={<span className="text-xs font-medium text-gray-900 dark:text-gray-100">{r.name}</span>}
                      checked={isSelected}
                      onChange={() => toggleRole(r.id)}
                      containerClassName="w-full cursor-pointer"
                    />
                  </div>
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
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            {isSubmitting ? 'Creating Account...' : 'Create User'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
