/**
 * ResponsiveBoard — CSS-first adaptive chess board container.
 * Keeps width between 280px and 640px using clamp() with no JS resize logic.
 * Maintains square aspect ratio so the board never distorts.
 * Usage: wrap <Chessboard ... /> inside this.
 */
import React from 'react'

interface ResponsiveBoardProps {
  children: React.ReactNode
  /** Extra classes to apply to the outer container */
  className?: string
}

export function ResponsiveBoard({ children, className = '' }: ResponsiveBoardProps) {
  return (
    <div
      className={`mx-auto w-full ${className}`}
      style={{ maxWidth: 'clamp(280px, 90vw, 640px)' }}
    >
      {/* aspect-square ensures height === width at all viewport sizes */}
      <div className="w-full aspect-square relative overflow-hidden rounded-xl border border-border shadow-lg">
        {children}
      </div>
    </div>
  )
}
