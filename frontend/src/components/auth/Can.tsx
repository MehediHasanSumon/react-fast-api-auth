import React from 'react'
import { useAppSelector } from '../../store/hooks'
import {
  ENABLE_PERMISSION_ENFORCEMENT,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
} from '../../utils/permissions'

interface CanProps {
  permission?: string
  anyPermissions?: string[]
  allPermissions?: string[]
  role?: string
  anyRoles?: string[]
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Declarative authorization wrapper component.
 * Renders children only if current user has the required permission(s) or role(s).
 */
export const Can: React.FC<CanProps> = ({
  permission,
  anyPermissions,
  allPermissions,
  role,
  anyRoles,
  fallback = null,
  children,
}) => {
  const { user } = useAppSelector((state) => state.auth)

  if (!ENABLE_PERMISSION_ENFORCEMENT) {
    return <>{children}</>
  }

  let allowed = true

  if (permission && !hasPermission(user, permission)) {
    allowed = false
  }

  if (allowed && anyPermissions && anyPermissions.length > 0 && !hasAnyPermission(user, anyPermissions)) {
    allowed = false
  }

  if (allowed && allPermissions && allPermissions.length > 0 && !hasAllPermissions(user, allPermissions)) {
    allowed = false
  }

  if (allowed && role && !hasRole(user, role)) {
    allowed = false
  }

  if (allowed && anyRoles && anyRoles.length > 0 && !hasAnyRole(user, anyRoles)) {
    allowed = false
  }

  if (!allowed) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
