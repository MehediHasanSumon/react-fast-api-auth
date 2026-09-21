import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { KeyRound } from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import { http } from '../../api/client'
import { API_ENDPOINTS } from '../../api/endpoints'
import type { ApiErrorDetail } from '../../api/types'
import type { PermissionItem } from '../../types/rbac'

const createPermissionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter permission name (at least 2 characters)')
    .max(100, 'Permission name cannot exceed 100 characters')
    .regex(/^[a-zA-Z0-9_\-.:]+$/, 'Enter valid permission name (e.g. users.create, roles.view)'),
})

type CreatePermissionFormValues = z.infer<typeof createPermissionSchema>

interface CreatePermissionModalProps {
  isOpen: boolean
  onClose: () => void
  onPermissionCreated: (perm: PermissionItem) => void
}

export const CreatePermissionModal: React.FC<CreatePermissionModalProps> = ({
  isOpen,
  onClose,
  onPermissionCreated,
}) => {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreatePermissionFormValues>({
    resolver: zodResolver(createPermissionSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
    },
  })

  const handleModalClose = () => {
    reset()
    setServerError(null)
    onClose()
  }

  const onSubmit = async (values: CreatePermissionFormValues) => {
    setServerError(null)
    try {
      const cleanName = values.name.trim().toLowerCase()

      const payload = {
        name: cleanName,
        guard_name: 'web',
      }

      const response = await http.post<PermissionItem>(API_ENDPOINTS.PERMISSIONS.CREATE, payload)

      onPermissionCreated(response)
      handleModalClose()
    } catch (err: unknown) {
      const apiErr = err as {
        status?: number
        data?: {
          message?: string
          detail?: string | ApiErrorDetail[]
          errors?: Record<string, string[]>
        }
      }

      if (apiErr.status === 409) {
        const detailMsg =
          typeof apiErr.data?.detail === 'string'
            ? apiErr.data.detail
            : 'A permission with this name already exists.'
        setError('name', { type: 'server', message: detailMsg })
        return
      }

      if (apiErr.status === 422 && Array.isArray(apiErr.data?.detail)) {
        let mappedAny = false
        ;(apiErr.data.detail as any[]).forEach((issue: any) => {
          const field = issue.loc?.[issue.loc.length - 1]
          if (field === 'name') {
            setError('name', { type: 'server', message: issue.msg })
            mappedAny = true
          }
        })
        if (mappedAny) return
      }

      const fallbackMsg =
        typeof apiErr.data?.detail === 'string'
          ? apiErr.data.detail
          : apiErr.data?.message || 'Failed to create permission. Please try again.'
      setServerError(fallbackMsg)
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Create New Permission"
      description="Register a unique feature permission identifier"
      icon={<KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
        {serverError && (
          <Alert variant="danger" onClose={() => setServerError(null)}>
            {serverError}
          </Alert>
        )}

        <Input
          label="Permission Name"
          placeholder="Enter permission identifier (e.g. users.export)"
          required
          error={errors.name?.message}
          {...register('name')}
        />

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button
            type="button"
            variant="secondary"
            onClick={handleModalClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            leftIcon={<KeyRound className="w-4 h-4" />}
          >
            {isSubmitting ? 'Creating Permission...' : 'Create Permission'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
