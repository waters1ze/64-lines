'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface StockfishEval {
  evalText: string | null   // e.g. "+1.23" or "Мат в 3"
  bestMove: string | null   // e.g. "e2e4"
  isThinking: boolean
}

/**
 * useStockfishEval — shared Stockfish hook.
 * Launches a Stockfish Web Worker, sends the provided FEN,
 * and returns the evaluation. On FEN change, terminates the previous
 * computation and starts fresh. On unmount, terminates the worker.
 *
 * @param fen  Current board position in FEN notation.
 * @param depth  Search depth (default 15).
 * @param enabled  Set to false to skip analysis (default true).
 */
export function useStockfishEval(
  fen: string | null,
  depth = 15,
  enabled = true
): StockfishEval {
  const [evalText, setEvalText] = useState<string | null>(null)
  const [bestMove, setBestMove] = useState<string | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const engineRef = useRef<any>(null)

  const terminateEngine = useCallback(() => {
    if (engineRef.current) {
      try {
        engineRef.current.postMessage('stop')
        // stockfish.js exposes terminate() only in some builds; guard it
        if (typeof engineRef.current.terminate === 'function') {
          engineRef.current.terminate()
        }
      } catch (_) {}
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled || !fen) {
      setEvalText(null)
      setBestMove(null)
      setIsThinking(false)
      return
    }

    let cancelled = false
    setIsThinking(true)
    setEvalText(null)
    setBestMove(null)

    // Stop any previous search before starting a new one
    if (engineRef.current) {
      try { engineRef.current.postMessage('stop') } catch (_) {}
    }

    const runEngine = async () => {
      try {
        // Lazy-load stockfish only once; reuse if already instantiated
        if (!engineRef.current) {
          if (cancelled) return
          engineRef.current = new Worker('/stockfish/stockfish-18-lite-single.js')
        }

        const engine = engineRef.current
        if (!engine || cancelled) return

        // Determine whose turn it is from FEN (field 2: 'w'|'b')
        const turn = fen.split(' ')[1] ?? 'w'

        engine.onmessage = (event: any) => {
          if (cancelled) return
          const line: string = typeof event === 'string' ? event : (event?.data ?? '')
          if (!line) return

          // Parse score
          const scoreMatch = line.match(/score (cp|mate) (-?\d+)/)
          if (scoreMatch) {
            const type = scoreMatch[1]
            let val = parseInt(scoreMatch[2], 10)
            // Stockfish always reports from the side to move; invert for black
            if (turn === 'b') val = -val

            if (type === 'cp') {
              setEvalText((val > 0 ? '+' : '') + (val / 100).toFixed(2))
            } else if (type === 'mate') {
              const sign = val > 0 ? '' : '-'
              setEvalText(`Мат в ${sign}${Math.abs(val)}`)
            }
          }

          // Parse best move from the principal variation
          const pvMatch = line.match(/\bpv\s+([a-h][1-8][a-h][1-8][qrbn]?)/)
          if (pvMatch) {
            setBestMove(pvMatch[1])
          }

          // bestmove line signals analysis is done
          if (line.startsWith('bestmove')) {
            setIsThinking(false)
          }
        }

        engine.postMessage('uci')
        engine.postMessage('setoption name MultiPV value 1')
        engine.postMessage(`position fen ${fen}`)
        engine.postMessage(`go depth ${depth}`)
      } catch (err) {
        if (!cancelled) {
          console.error('[useStockfishEval] engine error:', err)
          setEvalText('Ошибка движка')
          setIsThinking(false)
        }
      }
    }

    runEngine()

    return () => {
      cancelled = true
      if (engineRef.current) {
        try { engineRef.current.postMessage('stop') } catch (_) {}
      }
      setIsThinking(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, depth, enabled])

  // Terminate engine when the component using this hook unmounts
  useEffect(() => {
    return () => {
      terminateEngine()
    }
  }, [terminateEngine])

  return { evalText, bestMove, isThinking }
}
