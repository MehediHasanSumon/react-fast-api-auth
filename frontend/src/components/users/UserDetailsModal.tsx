import React from 'react'
import {
  User,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  Shield,
} from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import type { UserRecord } from '../../data/mockUsers'

export interface UserDetailsModalProps {
  user: UserRecord | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (user: UserRecord) => void
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  user,
  isOpen,
  onClose,
  onEdit,
}) => {
  if (!user) return null

  const statusVariant =
    user.status === 'Active'
      ? 'success'
      : user.status === 'Inactive'
      ? 'neutral'
      : 'danger'

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="User Account Details"
      description="Comprehensive profile information, access roles, and system identifiers."
      icon={<User className="w-5 h-5" />}
      maxWidth="lg"
    >
      <div className="space-y-5 pt-1">
        {/* Profile Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-normal text-base shrink-0 border border-blue-200 dark:border-blue-900/50">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h4 className="text-base font-normal text-gray-900 dark:text-gray-100 truncate">
                {user.name}
              </h4>
              <p className="text-xs font-normal text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Badge variant={statusVariant} dot className="font-normal">
              {user.status}
            </Badge>
            {user.isVerified ? (
              <Badge variant="success" className="gap-1 font-normal">
                <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400 shrink-0" />
                <span>Verified</span>
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1 font-normal">
                <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Unverified</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Detailed Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-normal text-gray-500 dark:text-gray-400">
              <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>Full Name</span>
            </div>
            <p className="text-sm font-normal text-gray-900 dark:text-gray-100">
              {user.name}
            </p>
          </div>

          {/* Email Address */}
          <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-normal text-gray-500 dark:text-gray-400">
              <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>Email Address</span>
            </div>
            <p className="text-sm font-normal text-gray-900 dark:text-gray-100 break-all">
              {user.email}
            </p>
          </div>

          {/* Mobile Number */}
          <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-normal text-gray-500 dark:text-gray-400">
              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>Mobile Number</span>
            </div>
            <p className="text-sm font-normal text-gray-900 dark:text-gray-100">
              {user.phoneNumber || 'Not provided'}
            </p>
          </div>

          {/* Assigned Role */}
          <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-normal text-gray-500 dark:text-gray-400">
              <Shield className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>Assigned Role</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {user.roles && user.roles.length > 0 ? (
                user.roles.map((r) => (
                  <Badge key={r} variant="neutral" className="font-normal text-2xs">
                    {r}
                  </Badge>
                ))
              ) : user.role && user.role !== '—' && user.role !== 'N/A' ? (
                <Badge variant="neutral" className="font-normal text-2xs">
                  {user.role}
                </Badge>
              ) : (
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">No role assigned</span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          {onEdit && (
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                onClose()
                onEdit(user)
              }}
              leftIcon={<Pencil className="w-4 h-4" />}
            >
              Edit
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  )
}
