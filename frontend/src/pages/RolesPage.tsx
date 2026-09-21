import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Shield,
  Search,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  RefreshCw,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Checkbox } from '../components/ui/Checkbox'
import { Input } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'
import { ContextMenu } from '../components/ui/ContextMenu'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { CreateRoleModal } from '../components/roles/CreateRoleModal'
import { EditRoleModal } from '../components/roles/EditRoleModal'
import { http } from '../api/client'
import { API_ENDPOINTS } from '../api/endpoints'
import type { ApiErrorDetail } from '../api/types'
import type { RoleItem, RoleListResponse } from '../types/rbac'

export const RolesPage: React.FC = () => {
  // State: Data from Backend
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [totalRoles, setTotalRoles] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // State: Modals & Actions
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<RoleItem | null>(null)
  const [selectedRoleForDelete, setSelectedRoleForDelete] = useState<RoleItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // State: Bulk Selection & Bulk Delete
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set())
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // State: Context Menu (Right-Click & Touch Long-Press)
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    x: number
    y: number
    role: RoleItem | null
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    role: null,
  })

  // Refs for touch hold-press detection
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const isLongPressActiveRef = useRef(false)

  // State: Export Dropdown
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // State: Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')

  // State: Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // State: Feedback Banner
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  // Fetch Roles from Backend API
  const fetchRoles = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: pageSize,
      }
      if (appliedSearch) {
        params.search = appliedSearch
      }

      const res = await http.get<RoleListResponse>(API_ENDPOINTS.ROLES.LIST, { params })
      const mappedRoles: RoleItem[] = (res.roles || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        guard_name: r.guard_name || 'web',
        description: r.description,
        permissions: Array.isArray(r.permissions)
          ? r.permissions.map((p: any) => (typeof p === 'string' ? p : p.name))
          : [],
        users_count: r.user_count ?? r.users_count ?? 0,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }))

      setRoles(mappedRoles)
      setTotalRoles(res.total || 0)
      setTotalPages(res.total_pages || 1)
    } catch (err: unknown) {
      const apiErr = err as ApiErrorDetail
      setFetchError(apiErr?.message || 'Failed to fetch roles. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, pageSize, appliedSearch])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  // Close Export Dropdown on Outside Click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  // Auto-dismiss feedback notice
  useEffect(() => {
    if (!actionNotice) return
    const timer = setTimeout(() => setActionNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [actionNotice])

  // Handlers: Search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAppliedSearch(searchQuery.trim())
    setCurrentPage(1)
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setAppliedSearch('')
    setCurrentPage(1)
  }

  // Handlers: Role Created / Updated
  const handleRoleCreated = (newRole: RoleItem) => {
    setActionNotice(`Role "${newRole.name}" created successfully.`)
    fetchRoles()
  }

  const handleRoleUpdated = (updatedRole: RoleItem) => {
    setActionNotice(`Role "${updatedRole.name}" updated successfully.`)
    fetchRoles()
  }

  // Handlers: Edit & Delete
  const handleRowClick = (role: RoleItem) => {
    if (isLongPressActiveRef.current) {
      isLongPressActiveRef.current = false
      return
    }
    setSelectedRoleForEdit(role)
  }

  const handleRowContextMenu = (e: React.MouseEvent, role: RoleItem) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      role,
    })
  }

  const handleTouchStart = (e: React.TouchEvent, role: RoleItem) => {
    const touch = e.touches[0]
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }
    isLongPressActiveRef.current = false

    touchTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40)
      }
      setContextMenu({
        isOpen: true,
        x: touch.clientX,
        y: touch.clientY,
        role,
      })
    }, 500)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return
    const touch = e.touches[0]
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x)
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y)
    if (dx > 10 || dy > 10) {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current)
        touchTimerRef.current = null
      }
    }
  }

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current)
      touchTimerRef.current = null
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedRoleForDelete) return
    setIsDeleting(true)
    try {
      await http.delete(API_ENDPOINTS.ROLES.DELETE(selectedRoleForDelete.id))
      setActionNotice(`Role "${selectedRoleForDelete.name}" deleted successfully.`)
      setSelectedRoleForDelete(null)
      fetchRoles()
    } catch (err: unknown) {
      const apiErr = err as ApiErrorDetail
      setActionNotice(`Failed to delete role: ${apiErr?.message || 'Server error'}`)
    } finally {
      setIsDeleting(false)
    }
  }

  // Handlers: Bulk Actions
  const isSystemRole = (role: RoleItem) => {
    const name = (role.name || '').toLowerCase()
    return name === 'super admin' || name === 'admin'
  }

  const selectableRoles = roles.filter((r) => !isSystemRole(r))
  const isAllPageSelected =
    selectableRoles.length > 0 && selectableRoles.every((r) => selectedRoleIds.has(r.id))
  const isSomePageSelected =
    selectableRoles.some((r) => selectedRoleIds.has(r.id)) && !isAllPageSelected

  const handleToggleSelectRole = (role: RoleItem, e?: React.MouseEvent | React.ChangeEvent) => {
    e?.stopPropagation()
    if (isSystemRole(role)) return
    setSelectedRoleIds((prev) => {
      const next = new Set(prev)
      if (next.has(role.id)) {
        next.delete(role.id)
      } else {
        next.add(role.id)
      }
      return next
    })
  }

  const handleSelectAllCurrentPage = () => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev)
      if (isAllPageSelected) {
        selectableRoles.forEach((r) => next.delete(r.id))
      } else {
        selectableRoles.forEach((r) => next.add(r.id))
      }
      return next
    })
  }

  const handleClearSelection = () => {
    setSelectedRoleIds(new Set())
  }

  const handleConfirmBulkDelete = async () => {
    if (selectedRoleIds.size === 0) return
    setIsBulkDeleting(true)
    try {
      const count = selectedRoleIds.size
      await http.post(API_ENDPOINTS.ROLES.BULK_DELETE, {
        role_ids: Array.from(selectedRoleIds),
      })
      setActionNotice(`Successfully deleted ${count} role(s).`)
      setSelectedRoleIds(new Set())
      setIsBulkDeleteModalOpen(false)
      fetchRoles()
    } catch (err: unknown) {
      const apiErr = err as ApiErrorDetail
      setActionNotice(`Failed to delete roles: ${apiErr?.message || 'Server error'}`)
    } finally {
      setIsBulkDeleting(false)
    }
  }

  // Handlers: Export
  const handleExportCSV = () => {
    setExportMenuOpen(false)
    const headers = ['ID', 'Role Name', 'Guard', 'Permissions Count', 'Users Count', 'Description']
    const rows = roles.map((r) => [
      r.id,
      `"${r.name}"`,
      `"${r.guard_name}"`,
      r.permissions.length,
      r.users_count || 0,
      `"${r.description || ''}"`,
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `roles_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setActionNotice('Excel / CSV role roster exported successfully.')
  }

  const handleExportPDF = () => {
    setExportMenuOpen(false)
    setActionNotice('Preparing PDF export document. Use Print/Save as PDF to proceed.')
    setTimeout(() => {
      window.print()
    }, 300)
  }

  // Pagination display indices
  const displayStartIndex = totalRoles > 0 ? (currentPage - 1) * pageSize + 1 : 0
  const endIndex = Math.min(currentPage * pageSize, totalRoles)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* =========================================================================
          SECTION 1: BREADCRUMB NAVIGATION
      ========================================================================== */}
      <section aria-label="Breadcrumb Navigation" className="pt-0.5">
        <Breadcrumb items={[{ label: 'Role Management' }]} />
      </section>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 text-blue-800 dark:text-blue-300 text-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 p-1 rounded-lg cursor-pointer"
            aria-label="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =========================================================================
          SECTION 2: HEADER & ACTIONS (Export & Create)
      ========================================================================== */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
            Role Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage application roles, guard levels, and configure permissions per role.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Download Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setExportMenuOpen((prev) => !prev)}
              aria-expanded={exportMenuOpen}
              aria-haspopup="true"
              className="inline-flex flex-row items-center gap-2 h-10 px-4 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium transition cursor-pointer shadow-xs select-none whitespace-nowrap"
              title="Export Role Records"
            >
              <Download className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
              <span>Export</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0 ${
                  exportMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Export Options
                </div>

                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer text-left"
                >
                  <FileText className="w-4 h-4 text-red-500 shrink-0" />
                  <span>Download as PDF (.pdf)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer text-left"
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-600 shrink-0" />
                  <span>Download as Excel (.csv)</span>
                </button>
              </div>
            )}
          </div>

          {/* Create Role Button */}
          <Button
            type="button"
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<Shield className="w-4 h-4" />}
          >
            Create Role
          </Button>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: FILTER & SEARCH BAR
      ========================================================================== */}
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch gap-3">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Enter role name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="submit"
              variant="primary"
              leftIcon={<Search className="w-4 h-4" />}
            >
              Search
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={fetchRoles}
              disabled={isLoading}
              leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
          </div>
        </form>

        {appliedSearch && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800 text-xs">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Active Filters:</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <span>Query: "{appliedSearch}"</span>
              <button
                type="button"
                onClick={handleClearSearch}
                className="hover:text-blue-900 cursor-pointer"
                aria-label="Remove search filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>

            <button
              type="button"
              onClick={handleClearSearch}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ml-1 font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </section>

      {/* Fetch Error Alert */}
      {fetchError && (
        <Alert variant="danger" title="Error Connecting to Server">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>{fetchError}</span>
            <Button
              type="button"
              variant="secondary"
              onClick={fetchRoles}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {/* =========================================================================
          SECTION 4: DATA TABLE (Desktop Table & Mobile Stacked Cards)
      ========================================================================== */}
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <>
            {/* Desktop Skeleton */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-xs font-normal text-gray-500 dark:text-gray-400">
                    <th className="py-3.5 pl-5 pr-2 w-10">
                      <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-800" />
                    </th>
                    <th className="py-3.5 px-4 font-normal">Role</th>
                    <th className="py-3.5 px-4 font-normal">Guard</th>
                    <th className="py-3.5 px-4 font-normal">Permissions</th>
                    <th className="py-3.5 px-4 font-normal">Users</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={`skeleton-row-${idx}`} className="animate-pulse">
                      <td className="py-3.5 pl-5 pr-2 w-10">
                        <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-800" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-28" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-12" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded-full w-20" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-8" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Skeleton */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={`skeleton-card-${idx}`} className="p-4 space-y-3 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-28" />
                    <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded-full w-14" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-20" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : roles.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mb-3">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              No matching roles found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              {appliedSearch
                ? `No roles match your search term "${appliedSearch}".`
                : 'Get started by creating your first system role.'}
            </p>
            {appliedSearch && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <Button type="button" variant="secondary" onClick={handleClearSearch}>
                  Reset Search
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-xs font-normal text-gray-500 dark:text-gray-400 select-none">
                    <th className="py-3.5 pl-5 pr-2 w-10">
                      <Checkbox
                        checked={isAllPageSelected}
                        indeterminate={isSomePageSelected}
                        onChange={handleSelectAllCurrentPage}
                        aria-label="Select all roles on this page"
                      />
                    </th>
                    <th className="py-3.5 px-4 font-normal">Role</th>
                    <th className="py-3.5 px-4 font-normal">Guard</th>
                    <th className="py-3.5 px-4 font-normal">Permissions</th>
                    <th className="py-3.5 px-4 font-normal">Users</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm font-normal">
                  {roles.map((role) => {
                    const isProtected = isSystemRole(role)
                    return (
                      <tr
                        key={role.id}
                        onClick={() => handleRowClick(role)}
                        onContextMenu={(e) => handleRowContextMenu(e, role)}
                        onTouchStart={(e) => handleTouchStart(e, role)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        className={`hover:bg-blue-50/50 dark:hover:bg-gray-800/60 transition-colors font-normal cursor-pointer select-none ${
                          selectedRoleIds.has(role.id) ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                        }`}
                        title="Click to edit, right-click or hold to delete"
                      >
                        {/* Row Selection Checkbox */}
                        <td className="py-3.5 pl-5 pr-2 w-10 font-normal" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedRoleIds.has(role.id)}
                            disabled={isProtected}
                            onChange={() => handleToggleSelectRole(role)}
                            aria-label={`Select ${role.name}`}
                            title={isProtected ? 'System protected role cannot be deleted' : undefined}
                          />
                        </td>

                        {/* Role Name */}
                        <td className="py-3.5 px-4 font-normal">
                          <span className="text-sm font-normal text-gray-900 dark:text-gray-100">
                            {role.name}
                          </span>
                        </td>

                        {/* Guard */}
                        <td className="py-3.5 px-4 text-xs font-mono font-normal text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {role.guard_name}
                        </td>

                        {/* Permissions Count */}
                        <td className="py-3.5 px-4 font-normal whitespace-nowrap">
                          <Badge variant="info" className="font-normal">
                            {role.permissions.length} permissions
                          </Badge>
                        </td>

                        {/* Users Count */}
                        <td className="py-3.5 px-4 text-xs font-normal text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {role.users_count || 0}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {/* Mobile Select Page Items Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isAllPageSelected}
                    indeterminate={isSomePageSelected}
                    onChange={handleSelectAllCurrentPage}
                    aria-label="Select all on this page"
                  />
                  <span className="font-medium">Select page items</span>
                </div>
                {selectedRoleIds.size > 0 && (
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {selectedRoleIds.size} selected
                  </span>
                )}
              </div>

              {roles.map((role) => {
                const isProtected = isSystemRole(role)
                return (
                  <div
                    key={role.id}
                    onClick={() => handleRowClick(role)}
                    onContextMenu={(e) => handleRowContextMenu(e, role)}
                    onTouchStart={(e) => handleTouchStart(e, role)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`p-4 space-y-3 font-normal hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors cursor-pointer select-none ${
                      selectedRoleIds.has(role.id) ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                    }`}
                    title="Tap to edit, hold to delete"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                          <Checkbox
                            checked={selectedRoleIds.has(role.id)}
                            disabled={isProtected}
                            onChange={() => handleToggleSelectRole(role)}
                            aria-label={`Select ${role.name}`}
                            title={isProtected ? 'System protected role cannot be deleted' : undefined}
                          />
                        </div>
                        <p className="text-sm font-normal text-gray-900 dark:text-gray-100">
                          {role.name}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="info" className="font-normal text-3xs py-0.5 px-2">
                          {role.permissions.length} perms
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 text-gray-600 dark:text-gray-300 font-normal">
                      <div>
                        <span className="text-gray-400 dark:text-gray-500 block text-2xs uppercase font-normal">Guard</span>
                        <span className="text-gray-800 dark:text-gray-200 font-normal">{role.guard_name}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 dark:text-gray-500 block text-2xs uppercase font-normal">Assigned Users</span>
                        <span className="text-gray-800 dark:text-gray-200 font-normal">{role.users_count || 0}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>

      {/* =========================================================================
          SECTION 5: PAGINATION & PER-PAGE CONTROL
      ========================================================================== */}
      {totalRoles > 0 && (
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400 w-full sm:w-auto justify-between sm:justify-start">
            <span>
              Showing <strong className="text-gray-900 dark:text-gray-100">{displayStartIndex}</strong> to{' '}
              <strong className="text-gray-900 dark:text-gray-100">{endIndex}</strong> of{' '}
              <strong className="text-gray-900 dark:text-gray-100">{totalRoles}</strong> roles
            </span>

            <div className="flex items-center gap-1.5 ml-2">
              <label htmlFor="per-page-select" className="text-gray-500 select-none">
                Per page:
              </label>
              <select
                id="per-page-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="h-8 px-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-xs font-medium cursor-pointer focus:border-blue-500 focus:outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-xs"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition cursor-pointer ${
                  currentPage === pageNum
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-xs"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* Modals & Popovers */}
      <CreateRoleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onRoleCreated={handleRoleCreated}
      />

      {/* Row Right-Click & Hold-Press Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={{ x: contextMenu.x, y: contextMenu.y }}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
        items={[
          {
            label: 'Edit',
            icon: <Pencil className="w-3.5 h-3.5" />,
            onClick: () => {
              if (contextMenu.role) {
                setSelectedRoleForEdit(contextMenu.role)
              }
            },
          },
          {
            label: 'Delete',
            icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
            danger: true,
            onClick: () => {
              if (contextMenu.role) {
                setSelectedRoleForDelete(contextMenu.role)
              }
            },
          },
        ]}
      />

      {/* Edit Role Modal */}
      <EditRoleModal
        role={selectedRoleForEdit}
        isOpen={!!selectedRoleForEdit}
        onClose={() => setSelectedRoleForEdit(null)}
        onRoleUpdated={handleRoleUpdated}
      />

      {/* Delete Role Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!selectedRoleForDelete}
        onClose={() => setSelectedRoleForDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Role"
        description={`Are you sure you want to permanently delete role "${selectedRoleForDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Floating Bulk Action Bar */}
      {selectedRoleIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 dark:bg-gray-800 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-4 border border-gray-700/60 max-w-[calc(100vw-2rem)]">
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedRoleIds.size} {selectedRoleIds.size === 1 ? 'role' : 'roles'} selected
          </span>
          <div className="h-4 w-px bg-gray-700 dark:bg-gray-600 shrink-0" />
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-xs text-gray-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-700 transition cursor-pointer"
            >
              Deselect all
            </button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Delete Roles Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Delete Selected Roles"
        description={`Are you sure you want to permanently delete ${selectedRoleIds.size} selected role(s)? This action cannot be undone.`}
        confirmText="Delete Selected"
        cancelText="Cancel"
        variant="danger"
        isLoading={isBulkDeleting}
      />
    </div>
  )
}
