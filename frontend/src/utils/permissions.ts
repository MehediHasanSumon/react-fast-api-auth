export interface UserWithRBAC {
  role?: string
  roles?: string[]
  permissions?: string[]
}

const SUPER_ROLES = ['super admin', 'admin']

// Toggle RBAC permission gating. Currently false as requested ("apatoto permission on korar dorkar nai").
export const ENABLE_PERMISSION_ENFORCEMENT = false

/**
 * Check if user is Super Admin or Admin, granting unrestricted access
 */
export const isSuperUser = (user?: UserWithRBAC | null): boolean => {
  if (!ENABLE_PERMISSION_ENFORCEMENT) return true
  if (!user) return false
  if (user.role && SUPER_ROLES.includes(user.role.toLowerCase())) return true
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles.some((r) => SUPER_ROLES.includes(r.toLowerCase()))
  }
  return false
}

/**
 * Check if the user has a specific permission (or is Super Admin)
 */
export const hasPermission = (
  user: UserWithRBAC | null | undefined,
  permission: string
): boolean => {
  if (!ENABLE_PERMISSION_ENFORCEMENT) return true
  if (!user) return false
  if (isSuperUser(user)) return true
  if (!user.permissions || !Array.isArray(user.permissions)) return false
  return user.permissions.includes(permission)
}

/**
 * Check if user has ANY of the specified permissions
 */
export const hasAnyPermission = (
  user: UserWithRBAC | null | undefined,
  permissions: string[]
): boolean => {
  if (!ENABLE_PERMISSION_ENFORCEMENT) return true
  if (!user) return false
  if (isSuperUser(user)) return true
  if (!user.permissions || !Array.isArray(user.permissions)) return false
  return permissions.some((p) => user.permissions?.includes(p))
}

/**
 * Check if user has ALL of the specified permissions
 */
export const hasAllPermissions = (
  user: UserWithRBAC | null | undefined,
  permissions: string[]
): boolean => {
  if (!ENABLE_PERMISSION_ENFORCEMENT) return true
  if (!user) return false
  if (isSuperUser(user)) return true
  if (!user.permissions || !Array.isArray(user.permissions)) return false
  return permissions.every((p) => user.permissions?.includes(p))
}

/**
 * Check if user has a specific role
 */
export const hasRole = (
  user: UserWithRBAC | null | undefined,
  roleName: string
): boolean => {
  if (!user || !user.roles || !Array.isArray(user.roles)) return false
  const target = roleName.toLowerCase()
  return user.roles.some((r) => r.toLowerCase() === target)
}

/**
 * Check if user has ANY of the specified roles
 */
export const hasAnyRole = (
  user: UserWithRBAC | null | undefined,
  roleNames: string[]
): boolean => {
  if (!user || !user.roles || !Array.isArray(user.roles)) return false
  const lowerRoles = user.roles.map((r) => r.toLowerCase())
  return roleNames.some((r) => lowerRoles.includes(r.toLowerCase()))
}
