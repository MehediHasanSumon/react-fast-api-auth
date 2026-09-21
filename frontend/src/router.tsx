import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { ErrorLayout } from './layouts/ErrorLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { GuestRoute } from './components/GuestRoute'

// Application Pages
import { DashboardPage } from './pages/DashboardPage'
import { UsersPage } from './pages/UsersPage'
import { RolesPage } from './pages/RolesPage'
import { PermissionsPage } from './pages/PermissionsPage'
import { ProfilePage } from './pages/ProfilePage'

// Authentication Pages
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage'
import { EmailVerifyNoticePage } from './pages/auth/EmailVerifyNoticePage'
import { VerifyOtpPage } from './pages/auth/VerifyOtpPage'
import { TwoFactorPage } from './pages/auth/TwoFactorPage'
import { ConfirmPasswordPage } from './pages/auth/ConfirmPasswordPage'
import { ChangePasswordPage } from './pages/auth/ChangePasswordPage'
import { LogoutPage } from './pages/auth/LogoutPage'
import { AccountLockedPage } from './pages/auth/AccountLockedPage'
import { SessionExpiredPage } from './pages/auth/SessionExpiredPage'
import { UnauthorizedPage } from './pages/auth/UnauthorizedPage'

// Error Pages
import { ErrorPage } from './pages/errors/ErrorPage'

export const router = createBrowserRouter([
  // 1. Protected Core Application Workspace (Requires Login: Unauthenticated users redirected to /login)
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: 'users',
            element: <UsersPage />,
          },
          {
            path: 'roles',
            element: <RolesPage />,
          },
          {
            path: 'permissions',
            element: <PermissionsPage />,
          },
          {
            path: 'profile',
            element: <ProfilePage />,
          },
        ],
      },
      {
        element: <AuthLayout />,
        children: [
          {
            path: 'change-password',
            element: <ChangePasswordPage />,
          },
        ],
      },
    ],
  },

  // 2. Public / Guest Only Pages (Authenticated users cannot access: Redirected to /dashboard)
  {
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: 'login',
            element: <LoginPage />,
          },
          {
            path: 'register',
            element: <RegisterPage />,
          },
          {
            path: 'forgot-password',
            element: <ForgotPasswordPage />,
          },
          {
            path: 'reset-password',
            element: <ResetPasswordPage />,
          },
          {
            path: 'verify-email',
            element: <VerifyEmailPage />,
          },
          {
            path: 'email/verify',
            element: <EmailVerifyNoticePage />,
          },
          {
            path: 'verify-otp',
            element: <VerifyOtpPage />,
          },
          {
            path: 'two-factor',
            element: <TwoFactorPage />,
          },
          {
            path: 'confirm-password',
            element: <ConfirmPasswordPage />,
          },
          {
            path: 'account-locked',
            element: <AccountLockedPage />,
          },
          {
            path: 'session-expired',
            element: <SessionExpiredPage />,
          },
          {
            path: 'unauthorized',
            element: <UnauthorizedPage />,
          },
          {
            path: 'logout',
            element: <LogoutPage />,
          },
        ],
      },
    ],
  },

  // 3. Exception & Error Infrastructure (with ErrorLayout - Dedicated full-screen error canvas)
  {
    element: <ErrorLayout />,
    children: [
      {
        path: '400',
        element: <ErrorPage code={400} />,
      },
      {
        path: '401',
        element: <ErrorPage code={401} />,
      },
      {
        path: '403',
        element: <ErrorPage code={403} />,
      },
      {
        path: '404',
        element: <ErrorPage code={404} />,
      },
      {
        path: '405',
        element: <ErrorPage code={405} />,
      },
      {
        path: '408',
        element: <ErrorPage code={408} />,
      },
      {
        path: '409',
        element: <ErrorPage code={409} />,
      },
      {
        path: '419',
        element: <ErrorPage code={419} />,
      },
      {
        path: '422',
        element: <ErrorPage code={422} />,
      },
      {
        path: '429',
        element: <ErrorPage code={429} />,
      },
      {
        path: '500',
        element: <ErrorPage code={500} />,
      },
      {
        path: '502',
        element: <ErrorPage code={502} />,
      },
      {
        path: '503',
        element: <ErrorPage code={503} />,
      },
      {
        path: '504',
        element: <ErrorPage code={504} />,
      },
      {
        path: '*',
        element: <ErrorPage code={404} />,
      },
    ],
  },
])
