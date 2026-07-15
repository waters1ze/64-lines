'use client'

import React, { useEffect, useState } from 'react'
import { AlertTriangle, Info, X } from 'lucide-react'

interface NotificationBannerProps {
  message: string | null
  onClose: () => void
  type?: 'error' | 'warning' | 'info'
}

export function NotificationBanner({ message, onClose, type = 'warning' }: NotificationBannerProps) {
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (message) {
      setShouldRender(true)
      const timer = setTimeout(() => {
        onClose()
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [message, onClose])

  if (!message || !shouldRender) return null

  const getStyleClasses = () => {
    switch (type) {
      case 'error':
        return 'bg-red-500/90 border-red-500 text-white shadow-red-500/10'
      case 'info':
        return 'bg-blue-600/95 border-blue-600 text-white shadow-blue-500/10'
      default:
        return 'bg-amber-600/95 border-amber-600 text-white shadow-amber-500/10'
    }
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300 w-[90%] max-w-md">
      <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg ${getStyleClasses()}`}>
        <div className="flex items-center gap-2.5">
          {type === 'info' ? (
            <Info className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-semibold">{message}</span>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
