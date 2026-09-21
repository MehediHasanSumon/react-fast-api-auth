import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { apiClient, API_ENDPOINTS, clearAuthTokens, normalizeApiError } from '../../api'
import type { AxiosError } from 'axios'

export interface AuthUser {
  id: string
  name: string
  email: string
  mobile_number?: string | null
  avatar?: string | null
  is_verified: boolean
  status: string
  roles?: string[]
  permissions?: string[]
  created_at?: string | null
  updated_at?: string | null
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

/**
 * Synchronously retrieve display profile from client cookie
 * Allows zero API calls on page reload (0ms instant UI rendering)
 */
export const getUserFromDisplayCookie = (): AuthUser | null => {
  if (typeof document === 'undefined') return null
  try {
    const match = document.cookie.match(/(?:^|;\s*)hms_user_display=([^;]*)/)
    if (!match || !match[1]) return null
    const decoded = decodeURIComponent(match[1])
    const parsed = JSON.parse(decoded) as AuthUser
    if (parsed && parsed.name && parsed.email) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

/**
 * Helper to remove client display cookie on logout
 */
export const clearUserDisplayCookie = (): void => {
  if (typeof document === 'undefined') return
  document.cookie = 'hms_user_display=; Max-Age=0; path=/;'
}

const initialUser = getUserFromDisplayCookie()

const initialState: AuthState = {
  user: initialUser,
  isAuthenticated: Boolean(initialUser),
  isLoading: false, // Initialized synchronously, NO reload flash or extra network roundtrip!
  error: null,
}

export const fetchCurrentUser = createAsyncThunk<
  AuthUser,
  void,
  { rejectValue: string }
>('auth/fetchCurrentUser', async (_, { rejectWithValue }) => {
  try {
    const response = await apiClient.get<AuthUser>(API_ENDPOINTS.AUTH.ME)
    return response.data
  } catch (err) {
    const normalized = normalizeApiError(err as AxiosError)
    return rejectWithValue(normalized.message)
  }
})

export const logoutUser = createAsyncThunk<void, void>(
  'auth/logoutUser',
  async () => {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT)
    } finally {
      clearAuthTokens()
      clearUserDisplayCookie()
    }
  }
)

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload
      state.isAuthenticated = true
      state.isLoading = false
      state.error = null
    },
    clearUser: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.isLoading = false
      state.error = null
      clearUserDisplayCookie()
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload
        state.isAuthenticated = true
        state.isLoading = false
        state.error = null
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.user = null
        state.isAuthenticated = false
        state.isLoading = false
        state.error = action.payload || 'Failed to authenticate user'
        clearUserDisplayCookie()
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null
        state.isAuthenticated = false
        state.isLoading = false
        state.error = null
      })
  },
})

export const { setUser, clearUser } = authSlice.actions
export default authSlice.reducer
