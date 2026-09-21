import React, { useEffect, useRef, useState } from 'react'

export interface ContextMenuItem {
  label: string
  icon?: React.ReactNode
  danger?: boolean
  disabled?: boolean
  onClick: () => void
}

export interface ContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  onClose: () => void
  items: ContextMenuItem[]
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  onClose,
  items,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [adjustedPos, setAdjustedPos] = useState(position)

  // Clamp position within window bounds
  useEffect(() => {
    if (!isOpen) return

    const menuEl = menuRef.current
    const menuWidth = menuEl ? menuEl.offsetWidth : 180
    const menuHeight = menuEl ? menuEl.offsetHeight : 100

    const padding = 12
    const winWidth = window.innerWidth
    const winHeight = window.innerHeight

    let posX = position.x
    let posY = position.y

    if (posX + menuWidth > winWidth - padding) {
      posX = Math.max(padding, winWidth - menuWidth - padding)
    }

    if (posY + menuHeight > winHeight - padding) {
      posY = Math.max(padding, winHeight - menuHeight - padding)
    }

    setAdjustedPos({ x: posX, y: posY })
  }, [isOpen, position])

  // Outside click & Escape listener
  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      style={{
        position: 'fixed',
        left: `${adjustedPos.x}px`,
        top: `${adjustedPos.y}px`,
      }}
      className="z-50 min-w-44 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl py-1.5 px-1 animate-in fade-in zoom-in-95 duration-100 select-none"
    >
      {items.map((item, idx) => {
        const isDanger = item.danger

        return (
          <button
            key={`context-item-${idx}`}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              onClose()
              item.onClick()
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-normal rounded-lg transition cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed ${
              isDanger
                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            <span className="truncate">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
