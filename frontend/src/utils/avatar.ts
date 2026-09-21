/**
 * Resolve avatar image path to a displayable URL
 */
export const getAvatarUrl = (avatarPath?: string | null): string | null => {
  if (!avatarPath) return null
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath
  }
  const backendBase = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '')
    : 'http://localhost:8000'
  return `${backendBase}${avatarPath.startsWith('/') ? '' : '/'}${avatarPath}`
}
