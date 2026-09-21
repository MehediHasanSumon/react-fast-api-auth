import React from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Dialog } from './Dialog'
import { Button } from './Button'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'primary'
  isLoading?: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  maxWidth = 'md',
}) => {
  const isDanger = variant === 'danger'
  const iconContainerClassName = isDanger
    ? 'bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400'
    : 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400'

  const icon = isDanger ? (
    <Trash2 className="w-5 h-5" />
  ) : (
    <AlertTriangle className="w-5 h-5" />
  )

  return (
    <Dialog
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      title={title}
      description={description}
      maxWidth={maxWidth}
      icon={icon}
      iconContainerClassName={iconContainerClassName}
    >
      <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-100 dark:border-gray-800">
        <Button
          type="button"
          variant="secondary"
          disabled={isLoading}
          onClick={onClose}
        >
          {cancelText}
        </Button>
        <Button
          type="button"
          variant={variant === 'danger' ? 'destructive' : 'primary'}
          disabled={isLoading}
          onClick={onConfirm}
        >
          {isLoading ? 'Processing...' : confirmText}
        </Button>
      </div>
    </Dialog>
  )
}
