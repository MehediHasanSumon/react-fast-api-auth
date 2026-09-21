import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import {
  ShieldCheck,
  LayoutDashboard,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  LogIn,
  ChevronDown,
  User as UserIcon,
  Settings,
  Users,
  Shield,
  KeyRound,
} from 'lucide-react'
import { ThemeToggle } from '../components/ThemeToggle'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { logoutUser } from '../store/slices/authSlice'
import { hasPermission } from '../utils/permissions'
import { getAvatarUrl } from '../utils/avatar'

export const AppLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { user, isAuthenticated } = useAppSelector((state) => state.auth)

  // Layout State
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close user dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap()
      navigate('/login')
    } catch {
      navigate('/login')
    }
  }

  const isUserMgmtActive =
    location.pathname.startsWith('/users') ||
    location.pathname.startsWith('/roles') ||
    location.pathname.startsWith('/permissions')

  const [userMgmtOpen, setUserMgmtOpen] = useState(false)

  // Automatically close User Management dropdown when navigating away to another option
  useEffect(() => {
    if (!isUserMgmtActive) {
      setUserMgmtOpen(false)
    }
  }, [isUserMgmtActive])

  const handleToggleUserMgmt = () => {
    if (!sidebarExpanded) {
      setSidebarExpanded(true)
      setUserMgmtOpen(true)
    } else {
      setUserMgmtOpen((prev) => !prev)
    }
  }

  const userMgmtSubItems = [
    {
      to: '/users',
      label: 'User Management',
      icon: Users,
      permission: 'users.view',
    },
    {
      to: '/roles',
      label: 'Role Management',
      icon: Shield,
      permission: 'roles.view',
    },
    {
      to: '/permissions',
      label: 'Permission Management',
      icon: KeyRound,
      permission: 'permissions.view',
    },
  ].filter((item) => {
    if (!item.permission) return true
    return hasPermission(user, item.permission)
  })

  const hasUserMgmtAccess = userMgmtSubItems.length > 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 antialiased selection:bg-blue-100 selection:text-blue-700 transition-colors duration-150">
      {/* =========================================================================
          1. FIXED TOP NAVBAR (Always Visible, z-30)
      ========================================================================== */}
      <header className="fixed top-0 left-0 right-0 h-16 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors duration-150">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Left: Sidebar Toggle + Brand */}
          <div className="flex items-center gap-3">
            {/* Desktop Sidebar Toggle Button */}
            <button
              type="button"
              onClick={() => setSidebarExpanded((prev) => !prev)}
              className="hidden lg:inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition cursor-pointer"
              title={sidebarExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
              aria-label="Toggle Sidebar"
            >
              {sidebarExpanded ? (
                <PanelLeftClose className="w-5 h-5" />
              ) : (
                <PanelLeftOpen className="w-5 h-5" />
              )}
            </button>

            {/* Mobile Menu Drawer Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition cursor-pointer"
              aria-label="Open Mobile Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Brand Logo & Name */}
            <Link
              to="/dashboard"
              className="flex items-center gap-2.5 text-gray-900 dark:text-white hover:opacity-95 transition cursor-pointer shrink-0"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shadow-blue-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="font-semibold text-base text-gray-900 dark:text-white tracking-tight leading-tight">
                  Access Portal
                </div>
                <div className="text-2xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Administration
                </div>
              </div>
            </Link>
          </div>

          {/* Right: Theme Switcher & User Menu */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Theme Toggle (Single Cyclic Button) */}
            <ThemeToggle />

            {/* User Profile Menu Dropdown */}
            {isAuthenticated && user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-2.5 h-10 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium transition cursor-pointer select-none ${
                    userMenuOpen ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600' : ''
                  }`}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  title="User Menu"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                    {user.avatar ? (
                      <img
                        src={getAvatarUrl(user.avatar) || ''}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="max-w-[120px] truncate hidden md:inline">{user.name}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                      userMenuOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-left">
                    {/* User Name & Info Header */}
                    <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                        {user.avatar ? (
                          <img
                            src={getAvatarUrl(user.avatar) || ''}
                            alt={user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          user.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {user.name}
                        </p>
                        <p className="text-2xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    {/* Navigation Items */}
                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition cursor-pointer"
                      >
                        <UserIcon className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>Profile</span>
                      </Link>

                      <Link
                        to="/change-password"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>Settings</span>
                      </Link>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />

                    {/* Logout Option */}
                    <div className="px-1 py-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false)
                          handleLogout()
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium transition cursor-pointer shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. MOBILE BACKDROP OVERLAY
      ========================================================================== */}
      {mobileOpen && (
        <div
          className="fixed inset-0 top-16 bg-gray-900/50 backdrop-blur-xs z-20 lg:hidden cursor-pointer"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* =========================================================================
          3. COLLAPSIBLE FIXED SIDEBAR (z-20)
      ========================================================================== */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-20 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out ${
          // Mobile state
          mobileOpen ? 'translate-x-0 w-80 shadow-xl' : '-translate-x-full lg:translate-x-0'
        } ${
          // Desktop expanded vs collapsed width
          sidebarExpanded ? 'lg:w-80' : 'lg:w-20'
        }`}
      >
        {/* Navigation Items */}
        <div className="p-4 space-y-1.5 overflow-y-auto">
          {/* Dashboard Link */}
          <NavLink
            to="/dashboard"
            onClick={() => {
              setMobileOpen(false)
              setUserMgmtOpen(false)
            }}
            className={`flex items-center gap-3 h-10 px-3.5 rounded-lg text-sm font-medium transition cursor-pointer ${
              location.pathname === '/dashboard' || location.pathname === '/'
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/60 font-semibold'
                : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
            } ${!sidebarExpanded ? 'lg:justify-center' : ''}`}
            title="Dashboard"
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            <span
              className={`truncate transition-opacity duration-200 ${
                !sidebarExpanded ? 'lg:hidden' : 'block'
              }`}
            >
              Dashboard
            </span>
          </NavLink>

          {/* User Management Dropdown Button & Submenu */}
          {hasUserMgmtAccess && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={handleToggleUserMgmt}
                className={`w-full flex items-center justify-between h-10 px-3.5 rounded-lg text-sm font-medium transition cursor-pointer select-none ${
                  isUserMgmtActive && !userMgmtOpen
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/60 font-semibold'
                    : isUserMgmtActive
                    ? 'text-gray-900 dark:text-gray-100 bg-gray-100/80 dark:bg-gray-800/80'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                } ${!sidebarExpanded ? 'lg:justify-center' : ''}`}
                title="User Management"
                aria-expanded={userMgmtOpen}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Users className="w-5 h-5 shrink-0 text-gray-500 dark:text-gray-400" />
                  <span
                    className={`truncate transition-opacity duration-200 ${
                      !sidebarExpanded ? 'lg:hidden' : 'block'
                    }`}
                  >
                    User Management
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 shrink-0 ${
                    userMgmtOpen ? 'rotate-180' : ''
                  } ${!sidebarExpanded ? 'lg:hidden' : 'block'}`}
                />
              </button>

              {/* Submenu Items (Smooth Accordion Animation) */}
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-200 ease-in-out ${
                  userMgmtOpen && sidebarExpanded
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                }`}
              >
                <div className="overflow-hidden">
                  <div
                    className={`space-y-1 pt-1 ${
                      !sidebarExpanded
                        ? 'lg:hidden'
                        : 'ml-4 pl-3.5 border-l border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    {userMgmtSubItems.map((subItem) => {
                      const SubIcon = subItem.icon
                      const isSubActive = location.pathname.startsWith(subItem.to)

                      return (
                        <NavLink
                          key={subItem.to}
                          to={subItem.to}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-2.5 h-10 px-3 rounded-lg text-sm font-medium transition cursor-pointer ${
                            isSubActive
                              ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/60 font-semibold'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                          title={subItem.label}
                        >
                          <SubIcon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{subItem.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* =========================================================================
          4. SCROLLABLE CONTENT AREA
      ========================================================================== */}
      <div
        className={`pt-16 transition-all duration-300 ease-in-out ${
          sidebarExpanded ? 'lg:pl-80' : 'lg:pl-20'
        }`}
      >
        <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-950 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
