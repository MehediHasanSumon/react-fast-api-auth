export interface PermissionItem {
  id: string
  name: string
  guard_name: string
  description?: string | null
  roles_count?: number
  created_at?: string | null
  updated_at?: string | null
}

export interface RoleItem {
  id: string
  name: string
  guard_name: string
  description?: string | null
  permissions: string[]
  permission_ids?: string[]
  users_count?: number
  created_at?: string | null
  updated_at?: string | null
}

export interface RoleListResponse {
  roles: RoleItem[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface PermissionListResponse {
  permissions: PermissionItem[]
  total: number
  page: number
  limit: number
  total_pages: number
}
