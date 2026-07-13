import React, { useState, useRef, useEffect } from 'react'

export function ResizableBoardContainer({ children, initialWidth = 500, minWidth = 280, maxWidth = 800 }: { children: React.ReactNode, initialWidth?: number, minWidth?: number, maxWidth?: number }) {
  const [width, setWidth] = useState(initialWidth)
  const [isResizing, setIsResizing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isResizing || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      let newWidth = e.clientX - rect.left
      if (newWidth < minWidth) newWidth = minWidth
      if (newWidth > maxWidth) newWidth = maxWidth
      if (newWidth > window.innerWidth - 40) newWidth = window.innerWidth - 40
      setWidth(newWidth)
    }

    function handleMouseUp() {
      setIsResizing(false)
    }

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, minWidth, maxWidth])

  return (
    <div ref={containerRef} style={{ width: `${width}px`, maxWidth: '100%' }} className="relative group">
      <div className="w-full">
        {children}
      </div>
      
      {/* Minimalist drag handle like Lichess */}
      <div 
        className="absolute -bottom-3 -right-3 w-6 h-6 cursor-nwse-resize z-50 flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity bg-background rounded-full border shadow-sm"
        onMouseDown={(e) => {
          e.preventDefault()
          setIsResizing(true)
        }}
        onTouchStart={(e) => {
          setIsResizing(true)
        }}
        onTouchMove={(e) => {
          if (!isResizing || !containerRef.current) return
          const touch = e.touches[0]
          const rect = containerRef.current.getBoundingClientRect()
          let newWidth = touch.clientX - rect.left
          if (newWidth < minWidth) newWidth = minWidth
          if (newWidth > maxWidth) newWidth = maxWidth
          if (newWidth > window.innerWidth - 40) newWidth = window.innerWidth - 40
          setWidth(newWidth)
        }}
        onTouchEnd={() => setIsResizing(false)}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="9" y1="21" x2="21" y2="9"></line>
          <polyline points="9 21 3 21 3 15"></polyline>
          <line x1="21" y1="3" x2="3" y2="21"></line>
        </svg>
      </div>
    </div>
  )
}
