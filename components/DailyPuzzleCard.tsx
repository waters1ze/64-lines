'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Flame, CheckCircle, XCircle, RefreshCw, CalendarDays, Loader2 } from 'lucide-react'

interface DailyPuzzleData {
  puzzle: {
    id: string
    fen: string
    moves: string
    rating: number
    themes: string
  }
  date: string
  solved: boolean | null
  streak: number
}

export function DailyPuzzleCard() {
  const [data, setData] = useState<DailyPuzzleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [game, setGame] = useState<Chess | null>(null)
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null)
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [expectedMoves, setExpectedMoves] = useState<string[]>([])
  const [moveIndex, setMoveIndex] = useState(0)
  const [streak, setStreak] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const fetchPuzzle = useCallback(() => {
    setLoading(true)
    fetch('/api/daily-puzzle')
      .then(r => r.json())
      .then(d => {
        if (d.puzzle) {
          setData(d)
          setStreak(d.streak ?? 0)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchPuzzle() }, [fetchPuzzle])

  const handleStart = () => {
    if (!data?.puzzle) return
    const chess = new Chess(data.puzzle.fen)
    // Determine orientation from who is to move
    const toMove = data.puzzle.fen.split(' ')[1]
    setOrientation(toMove === 'w' ? 'white' : 'black')
    const moves = data.puzzle.moves.trim().split(' ').filter(Boolean)
    setExpectedMoves(moves)
    setMoveIndex(0)
    setGame(chess)
    setResult(null)
    setPlaying(true)
  }

  const submitResult = async (solved: boolean) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/daily-puzzle/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solved })
      })
      const d = await res.json()
      if (!d.alreadyAttempted) {
        setStreak(d.streak ?? 0)
        setData(prev => prev ? { ...prev, solved } : prev)
      }
    } catch { /* silent */ }
    setSubmitting(false)
  }

  const onPieceDrop = (sourceSquare: string, targetSquare: string) => {
    if (!game || result) return false
    const clone = new Chess(game.fen())
    let move: ReturnType<Chess['move']> | null = null
    try {
      move = clone.move({ from: sourceSquare, to: targetSquare, promotion: 'q' })
    } catch { return false }
    if (!move) return false

    const expected = expectedMoves[moveIndex]
    // Normalise expected move notation
    const tempCheck = new Chess(game.fen())
    let expectedMoveObj: ReturnType<Chess['move']> | null = null
    try { expectedMoveObj = tempCheck.move(expected) } catch { /* */ }

    if (!expectedMoveObj || move.lan !== expectedMoveObj.lan && move.san !== expectedMoveObj.san) {
      // Wrong move
      if (streak > 0) {
        // Strict mode: fail immediately
        setGame(clone)
        setResult('wrong')
        submitResult(false)
        return true
      } else {
        // Forgiving mode: snap back, don't fail
        // Optionally show a temporary message or just return false
        return false
      }
    }

    const nextIndex = moveIndex + 1
    setGame(clone)

    if (nextIndex >= expectedMoves.length) {
      // Puzzle complete!
      setResult('correct')
      submitResult(true)
      return true
    }

    setMoveIndex(nextIndex)

    // Auto-play opponent move
    setTimeout(() => {
      const opponentClone = new Chess(clone.fen())
      try {
        opponentClone.move(expectedMoves[nextIndex])
        setGame(opponentClone)
        setMoveIndex(nextIndex + 1)
      } catch { /* */ }
    }, 400)

    return true
  }

  if (loading) {
    return (
      <div className="bg-card border rounded-xl p-6 flex items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Загрузка задачи дня...</span>
      </div>
    )
  }

  if (!data?.puzzle) return null

  const themes = data.puzzle.themes?.split(' ').slice(0, 3).join(', ')

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-amber-500/5 to-orange-500/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="font-semibold text-sm">Задача дня</p>
            <p className="text-xs text-muted-foreground">Рейтинг {data.puzzle.rating} · {themes}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-600 px-3 py-1.5 rounded-full text-sm font-semibold">
          <Flame className="w-4 h-4" />
          <span>{streak}</span>
        </div>
      </div>

      <div className="p-5">
        {/* Already attempted */}
        {data.solved !== null && !playing && (
          <div className={`flex items-center gap-3 rounded-xl p-4 mb-4 ${
            data.solved
              ? 'bg-emerald-500/10 border border-emerald-500/20'
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            {data.solved
              ? <><CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" /><div><p className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">Решено!</p><p className="text-xs text-muted-foreground">Стрик: {streak} {streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'} подряд</p></div></>
              : <><XCircle className="w-5 h-5 text-red-500 shrink-0" /><div><p className="font-semibold text-sm text-red-700 dark:text-red-400">Не получилось сегодня</p><p className="text-xs text-muted-foreground">Попробуйте завтра!</p></div></>
            }
          </div>
        )}

        {/* In-game result feedback */}
        {playing && !result && streak > 0 && (
          <div className="flex items-center gap-2 rounded-xl p-3 mb-4 bg-orange-500/10 border border-orange-500/20 text-orange-600">
            <Flame className="w-5 h-5 shrink-0" />
            <p className="text-sm font-semibold">На кону стрик — права на ошибку нет!</p>
          </div>
        )}

        {playing && result && (
          <div className={`flex items-center gap-3 rounded-xl p-3 mb-4 ${
            result === 'correct'
              ? 'bg-emerald-500/10 border border-emerald-500/20'
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            {result === 'correct'
              ? <><CheckCircle className="w-5 h-5 text-emerald-500" /><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Правильно! +1 к стрику</p></>
              : <><XCircle className="w-5 h-5 text-red-500" /><p className="text-sm font-semibold text-red-700 dark:text-red-400">Неверно — не расстраивайся!</p></>
            }
          </div>
        )}

        {/* Board or start button */}
        {playing && game ? (
          <div className="mx-auto w-full" style={{ maxWidth: 'clamp(200px, 80vw, 380px)' }}>
            <div className="w-full aspect-square rounded-xl overflow-hidden border border-border shadow-md">
              <Chessboard
                options={{
                  position: game.fen(),
                  boardOrientation: orientation,
                  onPieceDrop: ({ sourceSquare, targetSquare }) =>
                    onPieceDrop(sourceSquare, targetSquare),
                  animationDurationInMs: 200,
                  arePiecesDraggable: !result
                }}
              />
            </div>
            {result && (
              <button
                className="mt-3 w-full outline-button text-sm py-2 flex items-center justify-center gap-2"
                onClick={() => { setPlaying(false); setResult(null) }}
              >
                <RefreshCw className="w-4 h-4" /> Закрыть
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {/* Mini preview board */}
            <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-border opacity-80">
              <Chessboard
                options={{
                  position: data.puzzle.fen,
                  arePiecesDraggable: false,
                  animationDurationInMs: 0
                }}
              />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-3">
                {data.solved !== null
                  ? 'Вы уже решили задачу сегодня. Приходите завтра!'
                  : 'Новая задача дня — проверьте свою тактику!'
                }
              </p>
              {data.solved === null && (
                <button
                  className="button text-sm py-2 px-4"
                  onClick={handleStart}
                >
                  Решить задачу дня
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
