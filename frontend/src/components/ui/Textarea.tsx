import React, { useId } from 'react'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  containerClassName?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      className = '',
      containerClassName = '',
      id: customId,
      disabled,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const textareaId = customId || (label ? generatedId : undefined)
    const errorId = error && textareaId ? `${textareaId}-error` : undefined
    const helperId = helperText && textareaId ? `${textareaId}-helper` : undefined

    return (
      <div className={`w-full text-left ${containerClassName}`}>
        {label && (
          <label
            htmlFor={textareaId}
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

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          required={required}
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperId}
          disabled={disabled}
          className={`w-full px-3.5 py-2.5 rounded-lg border bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition duration-150 ease-in-out focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20'
          } ${className}`}
          {...props}
        />

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

Textarea.displayName = 'Textarea'
