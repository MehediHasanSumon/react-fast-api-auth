import type { AuthTokens, AuthUnauthorizedReason } from './types'

const ACCESS_TOKEN_KEY = 'hms_access_token'
const REFRESH_TOKEN_KEY = 'hms_refresh_token'
const USER_DATA_KEY = 'hms_user_profile'
const UNAUTHORIZED_EVENT_NAME = 'hms:auth:unauthorized'

/**
 * Safely access localStorage in browser environment
 */
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

export const getAccessToken = (): string | null => {
  if (!isBrowser) return null
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  } catch {
    return null
  }
}

export const setAccessToken = (token: string): void => {
  if (!isBrowser) return
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
  } catch {
    // Gracefully handle quota or storage permission issues
  }
}

export const removeAccessToken = (): void => {
  if (!isBrowser) return
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
  } catch {
    // Ignore storage clear errors
  }
}

export const getRefreshToken = (): string | null => {
  if (!isBrowser) return null
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  } catch {
    return null
  }
}

export const setRefreshToken = (token: string): void => {
  if (!isBrowser) return
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
  } catch {
    // Ignore storage set errors
  }
}

export const removeRefreshToken = (): void => {
  if (!isBrowser) return
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch {
    // Ignore storage clear errors
  }
}

/**
 * Persist both access and optional refresh tokens
 */
export const setAuthTokens = ({ accessToken, refreshToken }: AuthTokens): void => {
  setAccessToken(accessToken)
  if (refreshToken) {
    setRefreshToken(refreshToken)
  }
}

/**
 * Clear all stored tokens and cached authentication profile
 */
export const clearAuthTokens = (): void => {
  removeAccessToken()
  removeRefreshToken()
  if (isBrowser) {
    try {
      localStorage.removeItem(USER_DATA_KEY)
    } catch {
      // Ignore storage clear errors
    }
  }
}

/**
 * Check if the user currently holds an access token
 */
export const hasAccessToken = (): boolean => {
  return Boolean(getAccessToken())
}

/**
 * Broadcast an unauthorized event to notify application components / router
 */
export const emitAuthUnauthorized = (reason: AuthUnauthorizedReason = 'session_expired'): void => {
  if (!isBrowser) return
  window.dispatchEvent(
    new CustomEvent(UNAUTHORIZED_EVENT_NAME, {
      detail: { reason },
    })
  )
}

/**
 * Subscribe to unauthorized / session expiration events
 * @returns Cleanup function to unsubscribe
 */
export const onAuthUnauthorized = (
  callback: (reason: AuthUnauthorizedReason) => void
): (() => void) => {
  if (!isBrowser) {
    return () => {}
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ reason: AuthUnauthorizedReason }>
    callback(customEvent.detail?.reason || 'session_expired')
  }

  window.addEventListener(UNAUTHORIZED_EVENT_NAME, handler)
  return () => {
    window.removeEventListener(UNAUTHORIZED_EVENT_NAME, handler)
  }
}
