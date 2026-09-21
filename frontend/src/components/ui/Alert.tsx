import React from 'react'
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

export type AlertVariant = 'danger' | 'warning' | 'success' | 'info'

export interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: React.ReactNode
  onClose?: () => void
  className?: string
}

const variantConfig: Record<
  AlertVariant,
  {
    container: string
    icon: typeof AlertCircle
    iconClass: string
    titleClass: string
  }
> = {
  danger: {
    container:
      'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300',
    icon: AlertCircle,
    iconClass: 'text-red-600 dark:text-red-400',
    titleClass: 'text-red-900 dark:text-red-200',
  },
  warning: {
    container:
      'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300',
    icon: AlertTriangle,
    iconClass: 'text-amber-600 dark:text-amber-400',
    titleClass: 'text-amber-900 dark:text-amber-200',
  },
  success: {
    container:
      'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800/60 text-green-800 dark:text-green-300',
    icon: CheckCircle2,
    iconClass: 'text-green-600 dark:text-green-400',
    titleClass: 'text-green-900 dark:text-green-200',
  },
  info: {
    container:
      'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300',
    icon: Info,
    iconClass: 'text-blue-600 dark:text-blue-400',
    titleClass: 'text-blue-900 dark:text-blue-200',
  },
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'danger',
  title,
  children,
  onClose,
  className = '',
}) => {
  const config = variantConfig[variant]
  const IconComponent = config.icon

  return (
    <div
      role="alert"
      className={`p-4 rounded-xl border flex items-start gap-3 text-sm transition-colors text-left ${config.container} ${className}`}
    >
      <IconComponent className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconClass}`} />

      <div className="flex-1 min-w-0">
        {title && <h4 className={`font-semibold text-sm mb-1 ${config.titleClass}`}>{title}</h4>}
        <div className="text-xs sm:text-sm leading-relaxed">{children}</div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 -mr-1 -mt-1 p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
