import React, { useId } from 'react'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode
  description?: string
  error?: string
  containerClassName?: string
  indeterminate?: boolean
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      description,
      error,
      required,
      className = '',
      containerClassName = '',
      id: customId,
      disabled,
      indeterminate,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const checkboxId = customId || (label ? generatedId : undefined)
    const errorId = error && checkboxId ? `${checkboxId}-error` : undefined
    const innerRef = React.useRef<HTMLInputElement | null>(null)

    React.useImperativeHandle(ref, () => innerRef.current!)

    React.useEffect(() => {
      if (innerRef.current) {
        innerRef.current.indeterminate = Boolean(indeterminate)
      }
    }, [indeterminate])

    return (
      <div className={`text-left ${containerClassName}`}>
        <div className="flex items-start">
          <input
            ref={innerRef}
            type="checkbox"
            id={checkboxId}
            required={required}
            aria-required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
            disabled={disabled}
            className={`w-4 h-4 mt-0.5 text-blue-600 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            {...props}
          />
          {label && (
            <label
              htmlFor={checkboxId}
              className="ml-2.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none leading-tight"
            >
              {label}
              {required && (
                <span className="text-red-600 dark:text-red-400 ml-1" aria-hidden="true">
                  *
                </span>
              )}
              {description && (
                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-normal">
                  {description}
                </span>
              )}
            </label>
          )}
        </div>

        {error && (
          <p id={errorId} className="mt-1 ml-6 text-xs text-red-600 dark:text-red-400 font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'
