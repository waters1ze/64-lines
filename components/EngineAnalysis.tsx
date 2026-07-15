'use client'

import React from 'react'
import { Chess } from 'chess.js'
import { Loader2 } from 'lucide-react'
import { useStockfishEval } from '@/lib/useStockfishEval'

/**
 * EngineAnalysis — displays Stockfish evaluation for a given PGN.
 * Used by teachers when reviewing student homework.
 * Internally converts PGN → FEN and delegates to useStockfishEval.
 */
export function EngineAnalysis({ pgn }: { pgn: string }) {
  // Derive FEN from PGN (null on error so hook skips analysis)
  let fen: string | null = null
  if (pgn) {
    try {
      const game = new Chess()
      game.loadPgn(pgn)
      fen = game.fen()
    } catch (_) {
      fen = null
    }
  }

  const { evalText, bestMove, isThinking } = useStockfishEval(fen)

  if (!pgn) return null

  if (!fen) {
    return (
      <div className="bg-muted p-4 rounded-lg mt-4 text-sm border shadow-sm">
        <p className="text-destructive font-medium">Неверный PGN — не удалось загрузить позицию.</p>
      </div>
    )
  }

  return (
    <div className="bg-muted p-4 rounded-lg mt-4 text-sm border shadow-sm">
      <h4 className="font-bold mb-2 flex items-center gap-2">
        <span>🤖</span>
        Мгновенная оценка Stockfish
        {isThinking && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
      </h4>

      <p className="mb-1">
        Оценка позиции:{' '}
        <b className={`text-lg ${
          evalText?.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' :
          evalText?.startsWith('Мат') ? 'text-amber-600 dark:text-amber-400' :
          evalText?.startsWith('-') ? 'text-red-600 dark:text-red-400' : ''
        }`}>
          {evalText ?? (isThinking ? 'Анализ...' : '—')}
        </b>
      </p>

      {bestMove && (
        <div className="mt-1">
          <p className="text-muted-foreground text-xs">
            Лучший ход:{' '}
            <code className="font-mono text-foreground bg-background px-1 rounded">{bestMove}</code>
          </p>
        </div>
      )}
    </div>
  )
}
