import React, { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, CheckSquare, Square, Search, X } from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import { http } from '../../api/client'
import { API_ENDPOINTS } from '../../api/endpoints'
import type { ApiErrorDetail } from '../../api/types'
import type { PermissionItem, RoleItem } from '../../types/rbac'

const editRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter role name (at least 2 characters)')
    .max(50, 'Role name cannot exceed 50 characters'),
  guard_name: z
    .string()
    .trim()
    .min(1, 'Enter guard name'),
})

type EditRoleFormValues = z.infer<typeof editRoleSchema>

interface EditRoleModalProps {
  role: RoleItem | null
  isOpen: boolean
  onClose: () => void
  onRoleUpdated: (role: RoleItem) => void
}

interface RoleDetailApiResponse {
  id: string
  name: string
  guard_name: string
  description?: string | null
  user_count: number
  permissions: { id: string; name: string; guard_name: string }[]
}

export const EditRoleModal: React.FC<EditRoleModalProps> = ({
  role,
  isOpen,
  onClose,
  onRoleUpdated,
}) => {
  const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([])
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set())
  const [permissionSearch, setPermissionSearch] = useState('')
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditRoleFormValues>({
    resolver: zodResolver(editRoleSchema),
    mode: 'onTouched',
  })

  // Load role details and all permissions
  useEffect(() => {
    if (!isOpen || !role) return

    let isMounted = true

    const loadData = async () => {
      setIsLoadingDetails(true)
      setServerError(null)
      try {
        const [permsRes, roleRes] = await Promise.all([
          http.get<PermissionItem[]>(API_ENDPOINTS.PERMISSIONS.ALL),
          http.get<RoleDetailApiResponse>(API_ENDPOINTS.ROLES.GET(role.id)),
        ])

        if (!isMounted) return

        setAllPermissions(Array.isArray(permsRes) ? permsRes : [])

        reset({
          name: roleRes?.name || role.name,
          guard_name: roleRes?.guard_name || role.guard_name,
        })

        const activePermIds = new Set((roleRes?.permissions || []).map((p) => p.id))
        setSelectedPermissionIds(activePermIds)
      } catch (err: unknown) {
        if (!isMounted) return
        const apiErr = err as { data?: { detail?: string } }
        setServerError(apiErr.data?.detail || 'Failed to load role details')
      } finally {
        if (isMounted) {
          setIsLoadingDetails(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [isOpen, role, reset])

  const handleModalClose = () => {
    reset()
    setSelectedPermissionIds(new Set())
    setPermissionSearch('')
    setServerError(null)
    onClose()
  }

  // Filter permissions based on search query
  const filteredPermissions = useMemo(() => {
    if (!permissionSearch.trim()) return allPermissions
    const query = permissionSearch.toLowerCase().trim()
    return allPermissions.filter((p) => p.name.toLowerCase().includes(query))
  }, [allPermissions, permissionSearch])

  // Toggle single permission
  const togglePermission = (id: string) => {
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Toggle select all / deselect all
  const isAllSelected = allPermissions.length > 0 && selectedPermissionIds.size === allPermissions.length

  const toggleSelectAll = () => {
    if (permissionSearch.trim()) {
      const filteredIds = filteredPermissions.map((p) => p.id)
      const allFilteredSelected =
        filteredIds.length > 0 && filteredIds.every((id) => selectedPermissionIds.has(id))

      setSelectedPermissionIds((prev) => {
        const next = new Set(prev)
        if (allFilteredSelected) {
          filteredIds.forEach((id) => next.delete(id))
        } else {
          filteredIds.forEach((id) => next.add(id))
        }
        return next
      })
    } else {
      if (isAllSelected) {
        setSelectedPermissionIds(new Set())
      } else {
        setSelectedPermissionIds(new Set(allPermissions.map((p) => p.id)))
      }
    }
  }

  const onSubmit = async (values: EditRoleFormValues) => {
    if (!role) return
    setServerError(null)
    try {
      const payload = {
        name: values.name.trim(),
        guard_name: values.guard_name?.trim() || 'web',
        permission_ids: Array.from(selectedPermissionIds),
      }

      const response = await http.put<RoleItem>(API_ENDPOINTS.ROLES.UPDATE(role.id), payload)

      onRoleUpdated(response)
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
            : 'Another role with this name already exists.'
        setError('name', { type: 'server', message: detailMsg })
        return
      }

      if (apiErr.status === 403) {
        const detailMsg =
          typeof apiErr.data?.detail === 'string'
            ? apiErr.data.detail
            : 'This role is system-protected and cannot be modified.'
        setServerError(detailMsg)
        return
      }

      if (apiErr.status === 422 && Array.isArray(apiErr.data?.detail)) {
        let mappedAny = false
        ;(apiErr.data.detail as any[]).forEach((issue: any) => {
          const field = issue.loc?.[issue.loc.length - 1]
          if (field === 'name') {
            setError('name', { type: 'server', message: issue.msg })
            mappedAny = true
          } else if (field === 'guard_name') {
            setError('guard_name', { type: 'server', message: issue.msg })
            mappedAny = true
          }
        })
        if (mappedAny) return
      }

      setServerError(
        (typeof apiErr.data?.detail === 'string' ? apiErr.data.detail : null) ||
          apiErr.data?.message ||
          'Failed to update role. Please verify your inputs and try again.'
      )
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleModalClose}
      title={`Edit Role: ${role?.name || ''}`}
      description="Update role settings and manage permission matrix"
      icon={<Pencil className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
        {serverError && (
          <Alert variant="danger" onClose={() => setServerError(null)}>
            {serverError}
          </Alert>
        )}

        {isLoadingDetails ? (
          <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400 animate-pulse">
            Loading role configurations...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Input
                  label="Role Name"
                  placeholder="Enter role name"
                  required
                  error={errors.name?.message}
                  {...register('name')}
                />
              </div>

              <div>
                <Input
                  label="Guard Name"
                  placeholder="Enter guard"
                  error={errors.guard_name?.message}
                  {...register('guard_name')}
                />
              </div>
            </div>

            {/* Unified Permissions Section */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 bg-gray-50/70 dark:bg-gray-900/50 space-y-3">
              {/* Header & Quick Action */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Role Permissions
                </span>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 h-8 px-2.5"
                >
                  {isAllSelected ? (
                    <>
                      <Square className="w-3.5 h-3.5 mr-1" /> Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 mr-1" /> Select All
                    </>
                  )}
                </Button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Input
                  placeholder="Search permissions..."
                  value={permissionSearch}
                  onChange={(e) => setPermissionSearch(e.target.value)}
                  leftIcon={<Search className="w-4 h-4 text-gray-400" />}
                  rightIcon={
                    permissionSearch ? (
                      <button
                        type="button"
                        onClick={() => setPermissionSearch('')}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer p-0.5"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : undefined
                  }
                  className="h-9 text-xs"
                />
              </div>

              {/* Unified Scrollable Permissions Grid */}
              <div className="max-h-72 overflow-y-auto pr-1">
                {filteredPermissions.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      No permissions found matching "{permissionSearch}"
                    </p>
                    <button
                      type="button"
                      onClick={() => setPermissionSearch('')}
                      className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredPermissions.map((perm) => {
                      const isChecked = selectedPermissionIds.has(perm.id)
                      return (
                        <div
                          key={perm.id}
                          onClick={() => togglePermission(perm.id)}
                          className={`flex items-center p-2.5 rounded-lg border cursor-pointer transition select-none ${
                            isChecked
                              ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 ring-1 ring-blue-500/20'
                              : 'bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700/80'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(perm.id)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 cursor-pointer shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="ml-2.5 text-xs font-mono font-medium text-gray-900 dark:text-gray-100 truncate">
                            {perm.name}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

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
          </>
        )}
      </form>
    </Dialog>
  )
}
