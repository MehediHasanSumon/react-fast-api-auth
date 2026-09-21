import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil } from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import { http } from '../../api/client'
import { API_ENDPOINTS } from '../../api/endpoints'
import type { ApiErrorDetail } from '../../api/types'
import type { PermissionItem } from '../../types/rbac'

const editPermissionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter permission name (at least 2 characters)')
    .max(100, 'Permission name cannot exceed 100 characters')
    .regex(/^[a-zA-Z0-9_\-.:]+$/, 'Enter valid permission name (e.g. users.create)'),
})

type EditPermissionFormValues = z.infer<typeof editPermissionSchema>

interface EditPermissionModalProps {
  permission: PermissionItem | null
  isOpen: boolean
  onClose: () => void
  onPermissionUpdated: (perm: PermissionItem) => void
}

export const EditPermissionModal: React.FC<EditPermissionModalProps> = ({
  permission,
  isOpen,
  onClose,
  onPermissionUpdated,
}) => {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditPermissionFormValues>({
    resolver: zodResolver(editPermissionSchema),
    mode: 'onTouched',
  })

  useEffect(() => {
    if (!isOpen || !permission) return

    reset({
      name: permission.name,
    })
  }, [isOpen, permission, reset])

  const handleModalClose = () => {
    reset()
    setServerError(null)
    onClose()
  }

  const onSubmit = async (values: EditPermissionFormValues) => {
    if (!permission) return
    setServerError(null)

    try {
      const cleanName = values.name.trim().toLowerCase()

      const payload = {
        name: cleanName,
        guard_name: permission.guard_name || 'web',
      }

      const response = await http.put<PermissionItem>(
        API_ENDPOINTS.PERMISSIONS.UPDATE(permission.id),
        payload
      )

      onPermissionUpdated(response)
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
          : apiErr.data?.message || 'Failed to update permission. Please try again.'
      setServerError(fallbackMsg)
    }
  }

  if (!permission) return null

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Edit Permission"
      description="Update permission identifier key"
      icon={<Pencil className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
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
          placeholder="Enter permission identifier (e.g. users.create)"
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
            leftIcon={<Pencil className="w-4 h-4" />}
          >
            {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
