import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { apiClient, API_ENDPOINTS, clearAuthTokens } from '../../api'

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

const USER_PROFILE_STORAGE_KEY = 'hms_user_profile'

/**
 * Synchronously retrieve display profile from client cookie or localStorage fallback
 * Allows zero API calls on page reload (0ms instant UI rendering)
 */
export const getUserFromDisplayCookie = (): AuthUser | null => {
  if (typeof document === 'undefined') return null
  try {
    const match = document.cookie.match(/(?:^|;\s*)(?:app_user_display|hms_user_display)=([^;]*)/)
    if (match && match[1]) {
      const decoded = decodeURIComponent(match[1])
      const parsed = JSON.parse(decoded) as AuthUser
      if (parsed && parsed.name && parsed.email) {
        return parsed
      }
    }
  } catch {
    // Cookie parsing error fallback
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(USER_PROFILE_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as AuthUser
        if (parsed && parsed.name && parsed.email) {
          return parsed
        }
      }
    } catch {
      // LocalStorage parsing fallback
    }
  }

  return null
}

/**
 * Persist user display profile to cookie and localStorage
 */
export const persistUserDisplay = (user: AuthUser): void => {
  if (typeof document !== 'undefined') {
    try {
      const serialized = encodeURIComponent(JSON.stringify(user))
      document.cookie = `app_user_display=${serialized}; max-age=604800; path=/; SameSite=Lax`
    } catch {
      // Cookie write error fallback
    }
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(user))
    } catch {
      // LocalStorage quota or access fallback
    }
  }
}

/**
 * Helper to remove client display cookie and stored profile on logout
 */
export const clearUserDisplayCookie = (): void => {
  if (typeof document !== 'undefined') {
    document.cookie = 'app_user_display=; Max-Age=0; path=/;'
    document.cookie = 'hms_user_display=; Max-Age=0; path=/;'
  }
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(USER_PROFILE_STORAGE_KEY)
    } catch {
      // Ignore removal error
    }
  }
}

const initialUser = getUserFromDisplayCookie()

const initialState: AuthState = {
  user: initialUser,
  isAuthenticated: Boolean(initialUser),
  isLoading: false, // Initialized synchronously, NO reload flash or extra network roundtrip!
  error: null,
}

export interface FetchCurrentUserError {
  message: string
  isAuthError: boolean
}

export const fetchCurrentUser = createAsyncThunk<
  AuthUser,
  void,
  { rejectValue: FetchCurrentUserError }
>('auth/fetchCurrentUser', async (_, { rejectWithValue }) => {
  try {
    const response = await apiClient.get<AuthUser>(API_ENDPOINTS.AUTH.ME)
    return response.data
  } catch (err: unknown) {
    const errorObj = err as {
      status?: number
      response?: { status?: number }
      message?: string
    }
    const status = errorObj?.status ?? errorObj?.response?.status
    const isAuthError = status === 401 || status === 403
    const message = errorObj?.message || 'Failed to authenticate user'
    return rejectWithValue({
      message,
      isAuthError,
    })
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
      persistUserDisplay(action.payload)
    },
    updateUserProfile: (state, action: PayloadAction<Partial<AuthUser>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
        persistUserDisplay(state.user)
      }
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
        if (!state.user) {
          state.isLoading = true
        }
        state.error = null
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload
        state.isAuthenticated = true
        state.isLoading = false
        state.error = null
        persistUserDisplay(action.payload)
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        // Only clear user session on explicit authentication/authorization errors (401/403)
        // If it's a temporary offline/network glitch or server error, retain session so user isn't logged out
        if (action.payload?.isAuthError) {
          state.user = null
          state.isAuthenticated = false
          clearUserDisplayCookie()
          clearAuthTokens()
        }
        state.isLoading = false
        state.error = action.payload?.message || 'Failed to authenticate user'
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null
        state.isAuthenticated = false
        state.isLoading = false
        state.error = null
      })
  },
})

export const { setUser, updateUserProfile, clearUser } = authSlice.actions
export const logout = clearUser
export const authUser = fetchCurrentUser
export default authSlice.reducer
