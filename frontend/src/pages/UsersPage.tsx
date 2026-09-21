import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Users,
  Search,
  SlidersHorizontal,
  Download,
  UserPlus,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
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
import { CreateUserModal } from '../components/users/CreateUserModal'
import { EditUserModal } from '../components/users/EditUserModal'
import { UserDetailsModal } from '../components/users/UserDetailsModal'
import { AdvancedFilterModal } from '../components/users/AdvancedFilterModal'
import { http } from '../api/client'
import { API_ENDPOINTS } from '../api/endpoints'
import type { ApiErrorDetail } from '../api/types'
import {
  DEFAULT_FILTER_CRITERIA,
  type UserFilterCriteria,
  type UserRecord,
  type UserRole,
  type Department,
  type UserStatus,
} from '../data/mockUsers'

interface BackendUserItem {
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

interface BackendUserListResponse {
  users: BackendUserItem[]
  total: number
  page: number
  limit: number
  total_pages: number
}

const mapBackendUserToRecord = (u: BackendUserItem): UserRecord => {
  let uiStatus: UserStatus = 'Active'
  const st = (u.status || '').toLowerCase()
  if (st === 'deactived' || st === 'inactive') {
    uiStatus = 'Inactive'
  } else if (st === 'blocked' || st === 'baned' || st === 'suspended') {
    uiStatus = 'Suspended'
  }

  let joinedDate = '2025-01-01'
  if (u.created_at) {
    try {
      joinedDate = new Date(u.created_at).toISOString().split('T')[0]
    } catch {
      joinedDate = u.created_at.slice(0, 10)
    }
  }

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: (u.role as UserRole) || 'Doctor',
    department: (u.department as Department) || 'General Medicine',
    status: uiStatus,
    phoneNumber: u.mobile_number || undefined,
    isVerified: Boolean(u.is_verified),
    lastActive: 'Active recently',
    joinedDate,
  }
}

export const UsersPage: React.FC = () => {
  // State: Data from Backend
  const [users, setUsers] = useState<UserRecord[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // State: Modals & User Actions
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<UserRecord | null>(null)
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserRecord | null>(null)
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<UserRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // State: Bulk Selection & Bulk Delete
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // State: Context Menu (Right-Click & Touch Long-Press)
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    x: number
    y: number
    user: UserRecord | null
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    user: null,
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
  const [filters, setFilters] = useState<UserFilterCriteria>(DEFAULT_FILTER_CRITERIA)

  // State: Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // State: Feedback Banner
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  // Fetch Users from Backend API
  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const params: Record<string, string | number | boolean> = {
        page: currentPage,
        limit: pageSize,
        sort_by:
          filters.sortBy === 'name-asc'
            ? 'name_asc'
            : filters.sortBy === 'name-desc'
            ? 'name_desc'
            : filters.sortBy === 'oldest'
            ? 'oldest'
            : 'newest',
      }
      if (appliedSearch) {
        params.search = appliedSearch
      }
      if (filters.status !== 'ALL') {
        params.status =
          filters.status === 'Active'
            ? 'active'
            : filters.status === 'Inactive'
            ? 'deactived'
            : 'blocked'
      }
      if (filters.isVerified === 'VERIFIED') {
        params.is_verified = true
      } else if (filters.isVerified === 'UNVERIFIED') {
        params.is_verified = false
      }

      const res = await http.get<BackendUserListResponse>(API_ENDPOINTS.USERS.LIST, { params })
      setUsers(res.users.map(mapBackendUserToRecord))
      setTotalUsers(res.total)
      setTotalPages(res.total_pages)
    } catch (err: unknown) {
      const apiErr = err as ApiErrorDetail
      setFetchError(apiErr?.message || 'Failed to fetch user accounts. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, pageSize, appliedSearch, filters])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

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

  // Handlers: Filtering
  const handleApplyFilters = (newFilters: UserFilterCriteria) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTER_CRITERIA)
    setCurrentPage(1)
  }

  // Handlers: Create User
  const handleUserCreated = (newUser: UserRecord) => {
    setActionNotice(`User account for ${newUser.name} created successfully.`)
    fetchUsers()
  }

  // Handlers: User Details, Edit & Delete
  const handleRowClick = (user: UserRecord) => {
    if (isLongPressActiveRef.current) {
      isLongPressActiveRef.current = false
      return
    }
    setSelectedUserForDetails(user)
  }

  const handleRowContextMenu = (e: React.MouseEvent, user: UserRecord) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      user,
    })
  }

  const handleTouchStart = (e: React.TouchEvent, user: UserRecord) => {
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
        user,
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

  const handleUserUpdated = (updatedUser: UserRecord) => {
    setActionNotice(`User account for ${updatedUser.name} updated successfully.`)
    fetchUsers()
  }

  const handleConfirmDelete = async () => {
    if (!selectedUserForDelete) return
    setIsDeleting(true)
    try {
      await http.delete(API_ENDPOINTS.USERS.DELETE(selectedUserForDelete.id))
      setActionNotice(`User account '${selectedUserForDelete.name}' deleted successfully.`)
      setSelectedUserForDelete(null)
      fetchUsers()
    } catch (err: unknown) {
      const apiErr = err as ApiErrorDetail
      setActionNotice(`Failed to delete user: ${apiErr?.message || 'Server error'}`)
    } finally {
      setIsDeleting(false)
    }
  }

  // Handlers: Bulk Actions
  const isAllPageSelected =
    users.length > 0 && users.every((u) => selectedUserIds.has(u.id))
  const isSomePageSelected =
    users.some((u) => selectedUserIds.has(u.id)) && !isAllPageSelected

  const handleToggleSelectUser = (id: string, e?: React.MouseEvent | React.ChangeEvent) => {
    e?.stopPropagation()
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAllCurrentPage = () => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (isAllPageSelected) {
        users.forEach((u) => next.delete(u.id))
      } else {
        users.forEach((u) => next.add(u.id))
      }
      return next
    })
  }

  const handleClearSelection = () => {
    setSelectedUserIds(new Set())
  }

  const handleConfirmBulkDelete = async () => {
    if (selectedUserIds.size === 0) return
    setIsBulkDeleting(true)
    try {
      const count = selectedUserIds.size
      await http.post(API_ENDPOINTS.USERS.BULK_DELETE, {
        user_ids: Array.from(selectedUserIds),
      })
      setActionNotice(`Successfully deleted ${count} user account(s).`)
      setSelectedUserIds(new Set())
      setIsBulkDeleteModalOpen(false)
      fetchUsers()
    } catch (err: unknown) {
      const apiErr = err as ApiErrorDetail
      setActionNotice(`Failed to delete users: ${apiErr?.message || 'Server error'}`)
    } finally {
      setIsBulkDeleting(false)
    }
  }

  // Handlers: Export
  const handleExportCSV = () => {
    setExportMenuOpen(false)
    const headers = [
      'ID',
      'Full Name',
      'Email',
      'Mobile Number',
      'Role',
      'Status (Is Active)',
      'Verified',
    ]
    const rows = users.map((u) => [
      u.id,
      `"${u.name}"`,
      `"${u.email}"`,
      `"${u.phoneNumber || 'N/A'}"`,
      'N/A',
      u.status,
      u.isVerified ? 'Verified' : 'Unverified',
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setActionNotice('Excel / CSV user roster exported successfully.')
  }

  const handleExportPDF = () => {
    setExportMenuOpen(false)
    setActionNotice('Preparing PDF export document. Use Print/Save as PDF to proceed.')
    setTimeout(() => {
      window.print()
    }, 300)
  }

  // Pagination display indices
  const displayStartIndex = totalUsers > 0 ? (currentPage - 1) * pageSize + 1 : 0
  const endIndex = Math.min(currentPage * pageSize, totalUsers)

  // Active filter count
  const activeFiltersCount =
    (filters.status !== 'ALL' ? 1 : 0) +
    (filters.isVerified !== 'ALL' ? 1 : 0) +
    (appliedSearch ? 1 : 0)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* =========================================================================
          SECTION 1: BREADCRUMB NAVIGATION
      ========================================================================== */}
      <section aria-label="Breadcrumb Navigation" className="pt-0.5">
        <Breadcrumb items={[{ label: 'User Management' }]} />
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
          SECTION 2: USER MANAGEMENT HEADER & ACTIONS (Export & Create)
      ========================================================================== */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title & Description */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
            User Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage user accounts, roles, and administrative access.
          </p>
        </div>

        {/* Right Action Group: Download Dropdown + Create User */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Download Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setExportMenuOpen((prev) => !prev)}
              aria-expanded={exportMenuOpen}
              aria-haspopup="true"
              className="inline-flex flex-row items-center gap-2 h-10 px-4 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium transition cursor-pointer shadow-xs select-none whitespace-nowrap"
              title="Export User Records"
            >
              <Download className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
              <span>Export</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0 ${
                  exportMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
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

          {/* Create User Button */}
          <Button
            type="button"
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Create User
          </Button>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: FILTER & SEARCH BAR
      ========================================================================== */}
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch gap-3">
          {/* Search Box */}
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Enter name, email, or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Search Action Buttons */}
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
              onClick={() => setIsFilterModalOpen(true)}
              leftIcon={<SlidersHorizontal className="w-4 h-4" />}
              className="relative"
            >
              <span>Advanced Filters</span>
              {activeFiltersCount > (appliedSearch ? 1 : 0) && (
                <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 absolute top-2.5 right-2.5" />
              )}
            </Button>
          </div>
        </form>

        {/* Active Filter Chips */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800 text-xs">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Active Filters:</span>

            {appliedSearch && (
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
            )}

            {filters.status !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                <span>Status: {filters.status}</span>
                <button
                  type="button"
                  onClick={() => setFilters((p) => ({ ...p, status: 'ALL' }))}
                  className="hover:text-gray-900 cursor-pointer"
                  aria-label="Remove status filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.isVerified !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                <span>Verification: {filters.isVerified === 'VERIFIED' ? 'Verified' : 'Unverified'}</span>
                <button
                  type="button"
                  onClick={() => setFilters((p) => ({ ...p, isVerified: 'ALL' }))}
                  className="hover:text-gray-900 cursor-pointer"
                  aria-label="Remove verification filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                handleClearSearch()
                handleResetFilters()
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ml-1 font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* Fetch Error Alert */}
      {fetchError && (
        <Alert variant="danger" title="Error Connecting to Server">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>{fetchError}</span>
            <Button
              type="button"
              variant="secondary"
              onClick={fetchUsers}
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
          /* Skeleton Loader (GEMINI.md Rule 12) */
          <>
            {/* Desktop Skeleton */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-xs font-normal text-gray-500 dark:text-gray-400">
                    <th className="py-3.5 pl-5 pr-2 w-10">
                      <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-800" />
                    </th>
                    <th className="py-3.5 px-4 font-normal">User</th>
                    <th className="py-3.5 px-4 font-normal">Mobile Number</th>
                    <th className="py-3.5 px-4 font-normal">Role</th>
                    <th className="py-3.5 px-4 font-normal">Status</th>
                    <th className="py-3.5 px-4 font-normal">Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={`skeleton-row-${idx}`} className="animate-pulse">
                      <td className="py-3.5 pl-5 pr-2 w-10">
                        <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-800" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0" />
                          <div className="space-y-1.5 min-w-0">
                            <div className="h-3.5 bg-gray-200 dark:bg-gray-800 rounded w-32" />
                            <div className="h-3 bg-gray-100 dark:bg-gray-800/60 rounded w-44" />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-3.5 bg-gray-200 dark:bg-gray-800 rounded w-24" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded-md w-16" />
                          <div className="h-2.5 bg-gray-100 dark:bg-gray-800/60 rounded w-20" />
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded-full w-14" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded-md w-16" />
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
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800" />
                      <div className="space-y-1.5">
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-32" />
                        <div className="h-3 bg-gray-100 dark:bg-gray-800/60 rounded w-40" />
                      </div>
                    </div>
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
        ) : users.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              No matching user accounts
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              No users match your active search terms or filters in the system.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  handleClearSearch()
                  handleResetFilters()
                }}
              >
                Reset Search & Filters
              </Button>
            </div>
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
                        aria-label="Select all users on this page"
                      />
                    </th>
                    <th className="py-3.5 px-4 font-normal">User</th>
                    <th className="py-3.5 px-4 font-normal">Mobile Number</th>
                    <th className="py-3.5 px-4 font-normal">Role</th>
                    <th className="py-3.5 px-4 font-normal">Status</th>
                    <th className="py-3.5 px-4 font-normal">Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm font-normal">
                  {users.map((user) => {
                    const statusVariant =
                      user.status === 'Active'
                        ? 'success'
                        : user.status === 'Inactive'
                        ? 'neutral'
                        : 'danger'

                    return (
                      <tr
                        key={user.id}
                        onClick={() => handleRowClick(user)}
                        onContextMenu={(e) => handleRowContextMenu(e, user)}
                        onTouchStart={(e) => handleTouchStart(e, user)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        className={`hover:bg-blue-50/50 dark:hover:bg-gray-800/60 transition-colors font-normal cursor-pointer select-none ${
                          selectedUserIds.has(user.id) ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                        }`}
                        title="Click to view details, right-click or hold to edit/delete"
                      >
                        {/* Row Selection Checkbox */}
                        <td className="py-3.5 pl-5 pr-2 w-10 font-normal" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedUserIds.has(user.id)}
                            onChange={() => handleToggleSelectUser(user.id)}
                            aria-label={`Select ${user.name}`}
                          />
                        </td>

                        {/* User info: Avatar initial + Name + Email */}
                        <td className="py-3.5 px-4 font-normal">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-normal text-xs shrink-0 border border-blue-200 dark:border-blue-900/50">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-normal text-gray-900 dark:text-gray-100 truncate">
                                {user.name}
                              </p>
                              <p className="text-xs font-normal text-gray-500 dark:text-gray-400 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Mobile Number */}
                        <td className="py-3.5 px-4 text-xs font-normal text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {user.phoneNumber || '—'}
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4 font-normal text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          N/A
                        </td>

                        {/* Status (Is Active) */}
                        <td className="py-3.5 px-4 font-normal">
                          <Badge variant={statusVariant} dot className="font-normal">
                            {user.status}
                          </Badge>
                        </td>

                        {/* Verified */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-normal">
                          {user.isVerified ? (
                            <Badge variant="success" className="gap-1 font-normal">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                              <span>Verified</span>
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="gap-1 font-normal">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>Unverified</span>
                            </Badge>
                          )}
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
                {selectedUserIds.size > 0 && (
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {selectedUserIds.size} selected
                  </span>
                )}
              </div>

              {users.map((user) => {
                const statusVariant =
                  user.status === 'Active'
                    ? 'success'
                    : user.status === 'Inactive'
                    ? 'neutral'
                    : 'danger'

                return (
                  <div
                    key={user.id}
                    onClick={() => handleRowClick(user)}
                    onContextMenu={(e) => handleRowContextMenu(e, user)}
                    onTouchStart={(e) => handleTouchStart(e, user)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`p-4 space-y-3 font-normal hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors cursor-pointer select-none ${
                      selectedUserIds.has(user.id) ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                    }`}
                    title="Tap to view details, hold to edit/delete"
                  >
                    {/* Header: Checkbox + User avatar + name + status & verified badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                          <Checkbox
                            checked={selectedUserIds.has(user.id)}
                            onChange={() => handleToggleSelectUser(user.id)}
                            aria-label={`Select ${user.name}`}
                          />
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-normal text-sm shrink-0 border border-blue-200 dark:border-blue-900/50">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-normal text-gray-900 dark:text-gray-100">
                            {user.name}
                          </p>
                          <p className="text-xs font-normal text-gray-500 dark:text-gray-400">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant={statusVariant} dot className="font-normal">
                          {user.status}
                        </Badge>
                        {user.isVerified ? (
                          <Badge variant="success" className="text-3xs py-0 px-1.5 gap-0.5 font-normal">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Verified</span>
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-3xs py-0 px-1.5 gap-0.5 font-normal">
                            <AlertCircle className="w-2.5 h-2.5" />
                            <span>Unverified</span>
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 text-gray-600 dark:text-gray-300 font-normal">
                      <div>
                        <span className="text-gray-400 dark:text-gray-500 block text-2xs uppercase font-normal">Mobile Number</span>
                        <span className="text-gray-800 dark:text-gray-200 font-normal">{user.phoneNumber || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 dark:text-gray-500 block text-2xs uppercase font-normal">Role</span>
                        <span className="text-gray-800 dark:text-gray-200 font-normal">N/A</span>
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
      {totalUsers > 0 && (
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Summary & Page Size Selector */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400 w-full sm:w-auto justify-between sm:justify-start">
            <span>
              Showing <strong className="text-gray-900 dark:text-gray-100">{displayStartIndex}</strong> to{' '}
              <strong className="text-gray-900 dark:text-gray-100">{endIndex}</strong> of{' '}
              <strong className="text-gray-900 dark:text-gray-100">{totalUsers}</strong> users
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

          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            {/* Previous Page */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-xs"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Pills */}
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

            {/* Next Page */}
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
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={handleUserCreated}
      />

      <AdvancedFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        currentFilters={filters}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
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
              if (contextMenu.user) {
                setSelectedUserForEdit(contextMenu.user)
              }
            },
          },
          {
            label: 'Delete',
            icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
            danger: true,
            onClick: () => {
              if (contextMenu.user) {
                setSelectedUserForDelete(contextMenu.user)
              }
            },
          },
        ]}
      />

      {/* User Details Modal (Row Click) */}
      <UserDetailsModal
        user={selectedUserForDetails}
        isOpen={!!selectedUserForDetails}
        onClose={() => setSelectedUserForDetails(null)}
        onEdit={(user) => {
          setSelectedUserForDetails(null)
          setSelectedUserForEdit(user)
        }}
      />

      {/* Edit User Modal */}
      <EditUserModal
        user={selectedUserForEdit}
        isOpen={!!selectedUserForEdit}
        onClose={() => setSelectedUserForEdit(null)}
        onUserUpdated={handleUserUpdated}
      />

      {/* Delete User Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!selectedUserForDelete}
        onClose={() => setSelectedUserForDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete User Account"
        description={`Are you sure you want to permanently delete user account '${selectedUserForDelete?.name}' (${selectedUserForDelete?.email})? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Floating Bulk Action Bar */}
      {selectedUserIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 dark:bg-gray-800 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-4 border border-gray-700/60 max-w-[calc(100vw-2rem)]">
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedUserIds.size} {selectedUserIds.size === 1 ? 'user' : 'users'} selected
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

      {/* Bulk Delete Users Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Delete Selected Users"
        description={`Are you sure you want to permanently delete ${selectedUserIds.size} selected user account(s)? This action cannot be undone.`}
        confirmText="Delete Selected"
        cancelText="Cancel"
        variant="danger"
        isLoading={isBulkDeleting}
      />
    </div>
  )
}
