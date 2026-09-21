import React from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

interface ThemeToggleProps {
  className?: string
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, setTheme } = useTheme()

  const handleToggle = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const getThemeDetails = () => {
    switch (theme) {
      case 'light':
        return {
          icon: <Sun className="w-4 h-4 text-amber-500" />,
          label: 'Light',
          next: 'Dark',
        }
      case 'dark':
        return {
          icon: <Moon className="w-4 h-4 text-blue-400" />,
          label: 'Dark',
          next: 'System',
        }
      case 'system':
      default:
        return {
          icon: <Monitor className="w-4 h-4 text-gray-500 dark:text-gray-400" />,
          label: 'System',
          next: 'Light',
        }
    }
  }

  const current = getThemeDetails()

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={`Theme: ${current.label} (Click to switch to ${current.next})`}
      aria-label={`Toggle theme: currently ${current.label}`}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 transition duration-150 ease-in-out cursor-pointer shadow-2xs ${className}`}
    >
      {current.icon}
    </button>
  )
}
