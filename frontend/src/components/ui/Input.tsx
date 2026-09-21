import React, { useId } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  containerClassName?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      leftIcon,
      rightIcon,
      className = '',
      containerClassName = '',
      id: customId,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const inputId = customId || (label ? generatedId : undefined)
    const errorId = error && inputId ? `${inputId}-error` : undefined
    const helperId = helperText && inputId ? `${inputId}-helper` : undefined

    return (
      <div className={`w-full text-left ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 select-none"
          >
            {label}
            {required ? (
              <span className="text-red-600 dark:text-red-400 ml-1" aria-hidden="true">
                *
              </span>
            ) : (
              <span className="text-gray-400 dark:text-gray-500 font-normal ml-1 text-xs">
                (Optional)
              </span>
            )}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none shrink-0">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            required={required}
            aria-required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperId}
            disabled={disabled}
            className={`w-full h-10 px-3.5 rounded-lg border bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition duration-150 ease-in-out focus:outline-none focus:ring-2 disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-850 disabled:cursor-not-allowed ${
              leftIcon ? 'pl-10' : ''
            } ${rightIcon ? 'pr-10' : ''} ${
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20'
            } ${className}`}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 shrink-0">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p id={errorId} className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium" role="alert">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'
