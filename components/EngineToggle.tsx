'use client'

import React, { useState } from 'react'
import { Cpu, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { useStockfishEval } from '@/lib/useStockfishEval'

interface EngineToggleProps {
  /** Current FEN position to evaluate */
  fen: string | null
  /** Search depth (default 15) */
  depth?: number
  /** Extra class for outer wrapper */
  className?: string
}

/**
 * EngineToggle — small collapsible Stockfish panel.
 * Off by default to avoid wasting CPU in competitive modes (Puzzle Rush).
 * When toggled on, passes the FEN to useStockfishEval and shows result.
 * When toggled off, stops the engine (enabled=false terminates the search).
 */
export function EngineToggle({ fen, depth = 15, className = '' }: EngineToggleProps) {
  const [enabled, setEnabled] = useState(false)
  const { evalText, bestMove, isThinking } = useStockfishEval(fen, depth, enabled)

  return (
    <div className={`rounded-xl border bg-card overflow-hidden ${className}`}>
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setEnabled(e => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        aria-expanded={enabled}
      >
        <Cpu className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 text-left">Анализ Stockfish</span>
        {isThinking && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
        {enabled ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {/* Eval panel */}
      {enabled && (
        <div className="px-3 pb-3 pt-1 space-y-1.5 border-t">
          {!fen ? (
            <p className="text-xs text-muted-foreground">Ожидание позиции...</p>
          ) : isThinking && !evalText ? (
            <p className="text-xs text-muted-foreground animate-pulse">Считаю...</p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Оценка:</span>
                <span className={`text-sm font-bold tabular-nums ${
                  evalText?.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' :
                  evalText?.startsWith('Мат') ? 'text-amber-600 dark:text-amber-400' :
                  evalText?.startsWith('-') ? 'text-red-600 dark:text-red-400' :
                  'text-foreground'
                }`}>
                  {evalText ?? '—'}
                </span>
                {isThinking && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
              </div>
              {bestMove && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Лучший ход:</span>
                  <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{bestMove}</code>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
