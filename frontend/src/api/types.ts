import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'

/**
 * Standard API Success Response Envelope
 */
export interface ApiResponse<T = unknown> {
  data: T
  message?: string
  status?: number
  timestamp?: string
}

/**
 * FastAPI Validation Error Detail item (e.g. from 422 Unprocessable Entity)
 */
export interface ApiValidationErrorItem {
  loc: (string | number)[]
  msg: string
  type: string
}

/**
 * Normalized API Error Format for frontend consumption
 */
export interface ApiErrorDetail {
  message: string
  status: number
  code?: string
  errors?: Record<string, string[]>
  raw?: unknown
}

/**
 * Auth Token Pair Structure
 */
export interface AuthTokens {
  accessToken: string
  refreshToken?: string | null
  tokenType?: string
  expiresIn?: number
}

/**
 * Custom Internal Axios Request Config with internal flags
 */
export interface CustomInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
  skipAuth?: boolean
  silent?: boolean
}

/**
 * Custom Axios Request Config for external caller usage
 */
export interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean
  skipAuth?: boolean
  silent?: boolean
}

/**
 * Reason codes for unauthorized events
 */
export type AuthUnauthorizedReason =
  | 'session_expired'
  | 'no_refresh_token'
  | 'refresh_failed'
  | 'invalid_token'
  | 'manual_logout'
