import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export interface AccordionItem {
  id: string
  title: string
  content: React.ReactNode
  icon?: React.ReactNode
}

export interface AccordionProps {
  items: AccordionItem[]
  defaultOpenIds?: string[]
  allowMultiple?: boolean
  className?: string
}

export const Accordion: React.FC<AccordionProps> = ({
  items,
  defaultOpenIds = [],
  allowMultiple = false,
  className = '',
}) => {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds)

  const toggleItem = (id: string) => {
    if (allowMultiple) {
      setOpenIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      )
    } else {
      setOpenIds((prev) => (prev.includes(id) ? [] : [id]))
    }
  }

  return (
    <div
      className={`divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900 ${className}`}
    >
      {items.map((item) => {
        const isOpen = openIds.includes(item.id)

        return (
          <div key={item.id} className="transition-colors">
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              aria-expanded={isOpen}
              className="w-full py-4 px-5 flex items-center justify-between text-left font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition cursor-pointer focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-800"
            >
              <div className="flex items-center gap-3 pr-4">
                {item.icon && <span className="text-blue-600 dark:text-blue-400 shrink-0">{item.icon}</span>}
                <span className="text-sm sm:text-base font-medium">{item.title}</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 shrink-0 ${
                  isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                }`}
              />
            </button>

            {isOpen && (
              <div className="px-5 pb-4 pt-1 text-sm text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-100 dark:border-gray-850 animate-in slide-in-from-top-1 duration-150">
                {item.content}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
