import React, { useId } from 'react'

export interface SelectOption {
  value: string | number
  label: string
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options?: SelectOption[]
  placeholder?: string
  containerClassName?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      options,
      placeholder,
      children,
      className = '',
      containerClassName = '',
      id: customId,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const selectId = customId || (label ? generatedId : undefined)
    const errorId = error && selectId ? `${selectId}-error` : undefined
    const helperId = helperText && selectId ? `${selectId}-helper` : undefined

    return (
      <div className={`w-full text-left ${containerClassName}`}>
        {label && (
          <label
            htmlFor={selectId}
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

        <select
          ref={ref}
          id={selectId}
          required={required}
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperId}
          disabled={disabled}
          className={`w-full h-10 px-3.5 rounded-lg border bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 transition duration-150 ease-in-out focus:outline-none focus:ring-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20'
          } ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>

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

Select.displayName = 'Select'
