import axios from 'axios'
import type { AxiosError, AxiosResponse } from 'axios'
import type {
  ApiErrorDetail,
  ApiValidationErrorItem,
  CustomAxiosRequestConfig,
  CustomInternalAxiosRequestConfig,
} from './types'
import {
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
  clearAuthTokens,
  emitAuthUnauthorized,
} from './tokenStorage'
import { API_ENDPOINTS } from './endpoints'

/**
 * Safely determine API Base URL:
 * - When running in browser over HTTPS, automatically upgrades any accidental 'http://' to 'https://'
 *   or defaults to relative '/api/v1', preventing browser Mixed Content blocking.
 * - In local development or SSR, preserves localhost configuration.
 */
const resolveBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl) {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      if (envUrl.startsWith('http://') && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        return envUrl.replace(/^http:\/\//, 'https://')
      }
    }
    return envUrl
  }
  if (typeof window !== 'undefined') {
    return '/api/v1'
  }
  return 'http://localhost:8000/api/v1'
}

const BASE_URL: string = resolveBaseUrl()

/**
 * Primary Axios instance for API communication
 */
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true,
})

/**
 * Queue management to handle concurrent 401s during token refresh
 */
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error)
    } else if (token) {
      promise.resolve(token)
    }
  })
  failedQueue = []
}

/**
 * Convert unknown/Axios error into normalized, user-friendly error object
 */
export const normalizeApiError = (error: AxiosError<unknown>): ApiErrorDetail => {
  const status = error.response?.status ?? (error.code === 'ECONNABORTED' ? 408 : 0)
  let message = 'An unexpected error occurred. Please try again.'
  let errors: Record<string, string[]> | undefined

  if (error.code === 'ERR_NETWORK') {
    message = 'Unable to connect to the server. Please check your network connection.'
  } else if (error.code === 'ECONNABORTED') {
    message = 'The server took too long to respond. Request timed out.'
  } else if (error.response?.data && typeof error.response.data === 'object') {
    const data = error.response.data as Record<string, unknown>

    if (typeof data.detail === 'string') {
      message = data.detail
    } else if (Array.isArray(data.detail)) {
      // FastAPI 422 validation errors array
      message = 'Please correct the highlighted form errors and try again.'
      errors = {}
      const rawErrors = data.detail as ApiValidationErrorItem[]
      for (const item of rawErrors) {
        const fieldName =
          Array.isArray(item.loc) && item.loc.length > 0
            ? String(item.loc[item.loc.length - 1])
            : 'general'
        if (!errors[fieldName]) {
          errors[fieldName] = []
        }
        errors[fieldName].push(item.msg || 'Invalid field value')
      }
    } else if (typeof data.message === 'string') {
      message = data.message
    }
  } else if (error.message) {
    message = error.message
  }

  return {
    message,
    status,
    errors,
    raw: error,
  }
}

/**
 * REQUEST INTERCEPTOR
 * Automatically attaches Authorization header if an access token is stored
 */
apiClient.interceptors.request.use(
  (config: CustomInternalAxiosRequestConfig) => {
    if (!config.skipAuth) {
      const token = getAccessToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * RESPONSE INTERCEPTOR
 * Handles transparent JWT refresh on 401 Unauthorized and standardizes errors
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomInternalAxiosRequestConfig | undefined

    if (!originalRequest) {
      return Promise.reject(normalizeApiError(error))
    }

    const status = error.response?.status

    // 401 Unauthorized handling
    if (status === 401) {
      const requestUrl = originalRequest.url || ''
      const isAuthEndpoint =
        requestUrl.includes(API_ENDPOINTS.AUTH.LOGIN) ||
        requestUrl.includes(API_ENDPOINTS.AUTH.REFRESH) ||
        originalRequest.skipAuth

      // If already retried or this was an authentication endpoint, fail immediately
      if (originalRequest._retry || isAuthEndpoint) {
        clearAuthTokens()
        emitAuthUnauthorized('session_expired')
        return Promise.reject(normalizeApiError(error))
      }

      const currentRefreshToken = getRefreshToken()

      // If no refresh token available, invalidate session
      if (!currentRefreshToken) {
        clearAuthTokens()
        emitAuthUnauthorized('no_refresh_token')
        return Promise.reject(normalizeApiError(error))
      }

      // If another request is currently refreshing the token, queue this request
      if (isRefreshing) {
        return new Promise<AxiosResponse>((resolve, reject) => {
          failedQueue.push({
            resolve: (newToken: string) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`
              resolve(apiClient(originalRequest))
            },
            reject: (err: unknown) => {
              reject(err)
            },
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Direct call using unintercepted axios to avoid recursion
        const refreshResponse = await axios.post<{
          access_token?: string
          accessToken?: string
          refresh_token?: string
          refreshToken?: string
        }>(
          `${BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`,
          {
            refresh_token: currentRefreshToken,
            refreshToken: currentRefreshToken,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            withCredentials: true,
          }
        )

        const newAccessToken =
          refreshResponse.data.access_token || refreshResponse.data.accessToken
        const newRefreshToken =
          refreshResponse.data.refresh_token ||
          refreshResponse.data.refreshToken ||
          currentRefreshToken

        if (!newAccessToken) {
          throw new Error('Refresh endpoint did not return an access token')
        }

        setAuthTokens({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        })

        // Update default header and original request header
        apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

        // Drain queue of pending requests
        processQueue(null, newAccessToken)

        // Retry original request with fresh token
        return apiClient(originalRequest)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        clearAuthTokens()
        emitAuthUnauthorized('refresh_failed')
        return Promise.reject(normalizeApiError(error))
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(normalizeApiError(error))
  }
)

/**
 * Convenience HTTP Wrapper Methods for cleaner consumption
 */
export const http = {
  get: async <T>(url: string, config?: CustomAxiosRequestConfig): Promise<T> => {
    const response = await apiClient.get<T>(url, config)
    return response.data
  },

  post: async <T, D = unknown>(
    url: string,
    data?: D,
    config?: CustomAxiosRequestConfig
  ): Promise<T> => {
    const response = await apiClient.post<T>(url, data, config)
    return response.data
  },

  put: async <T, D = unknown>(
    url: string,
    data?: D,
    config?: CustomAxiosRequestConfig
  ): Promise<T> => {
    const response = await apiClient.put<T>(url, data, config)
    return response.data
  },

  patch: async <T, D = unknown>(
    url: string,
    data?: D,
    config?: CustomAxiosRequestConfig
  ): Promise<T> => {
    const response = await apiClient.patch<T>(url, data, config)
    return response.data
  },

  delete: async <T>(url: string, config?: CustomAxiosRequestConfig): Promise<T> => {
    const response = await apiClient.delete<T>(url, config)
    return response.data
  },
}

export default apiClient
