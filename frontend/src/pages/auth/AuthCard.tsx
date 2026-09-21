import React from 'react'

interface AuthCardProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}

export const AuthCard: React.FC<AuthCardProps> = ({
  title,
  subtitle,
  icon,
  children,
  footer,
}) => {
  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8 text-left transition-colors">
      {icon && <div className="mb-4">{icon}</div>}

      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {children}

      {footer && (
        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 text-center">
          {footer}
        </div>
      )}
    </div>
  )
}
