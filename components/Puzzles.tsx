'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Loader2, Crown, Trophy, CheckCircle2, XCircle } from 'lucide-react'

export function Puzzles({ isPremium, onPremiumClick }: { isPremium: boolean, onPremiumClick: () => void }) {
  const [puzzle, setPuzzle] = useState<any>(null)
  const [game, setGame] = useState<Chess | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [solved, setSolved] = useState(false)
  const [wrong, setWrong] = useState(false)
  const [moveIndex, setMoveIndex] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Fetch puzzle
  const fetchPuzzle = async () => {
    setLoading(true)
    setError(null)
    setSolved(false)
    setWrong(false)
    setMoveIndex(0)
    setRefreshKey(k => k + 1)
    
    try {
      const res = await fetch('/api/puzzles')
      if (res.status === 403) {
        setError('LIMIT_REACHED')
        setLoading(false)
        return
      }
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      
      setPuzzle(data)
      const newGame = new Chess()
      console.log('Loaded puzzle data:', data)
      try {
        const loaded = newGame.load(data.fen)
        console.log('FEN loaded successfully:', loaded, newGame.fen())
      } catch (err) {
        console.error('Error loading FEN:', data.fen, err)
      }
      
      // Make the first move automatically (opponent's move)
      const moves = data.moves.split(' ')
      if (moves.length > 0) {
        const move = moves[0]
        try {
          newGame.move({ from: move.substring(0, 2), to: move.substring(2, 4), promotion: move.length > 4 ? move[4] : undefined })
          setMoveIndex(1)
        } catch(e) {
          console.error('Error making first move:', move, e)
        }
      }
      setGame(newGame)
    } catch (e) {
      console.error('Outer fetch error:', e)
      setError('Не удалось загрузить задачу')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPuzzle()
  }, [])

  const submitResult = async (isCorrect: boolean) => {
    try {
      await fetch('/api/puzzles/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCorrect })
      })
    } catch (e) {}
  }

  const onDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    if (solved || wrong) return false

    try {
      const move = game?.move({ from: sourceSquare, to: targetSquare, promotion: piece[1].toLowerCase() ?? 'q' })
      if (!move) return false

      setGame(new Chess(game.fen()))

      const moves = puzzle.moves.split(' ')
      if (moveIndex < moves.length && moves[moveIndex] === move.lan) {
        // Correct move
        if (moveIndex === moves.length - 1) {
          // Solved
          setSolved(true)
          submitResult(true)
        } else {
          // Next move by opponent
          setMoveIndex(m => m + 1)
          setTimeout(() => {
            if (game) {
              const oppMove = moves[moveIndex + 1]
              game.move({ from: oppMove.substring(0, 2), to: oppMove.substring(2, 4), promotion: oppMove.length > 4 ? oppMove[4] : undefined })
              setGame(new Chess(game.fen()))
              setMoveIndex(m => m + 1)
              if (moveIndex + 1 === moves.length - 1) {
                setSolved(true)
                submitResult(true)
              }
            }
          }, 500)
        }
        return true
      } else {
        // Wrong move
        game?.undo()
        setWrong(true)
        submitResult(false)
        return false
      }
    } catch (e) {
      return false
    }
  }

  const [showBoard, setShowBoard] = useState(false)

  useEffect(() => {
    if (game && puzzle && game.fen() !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
      const timer = setTimeout(() => setShowBoard(true), 100)
      return () => clearTimeout(timer)
    } else {
      setShowBoard(false)
    }
  }, [game, puzzle])

  if (error === 'LIMIT_REACHED') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-6 max-w-md mx-auto">
        <div className="size-20 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
          <Crown className="size-10" />
        </div>
        <h2 className="text-2xl font-bold">Лимит исчерпан</h2>
        <p className="text-muted-foreground">Вам доступно 5 бесплатных задач в день. Чтобы решать задачи без ограничений, приобретите Premium подписку.</p>
        <button onClick={onPremiumClick} className="button w-full bg-amber-500 hover:bg-amber-600 text-white border-0 py-3 text-lg font-semibold shadow-lg shadow-amber-500/20">Оформить Premium</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl mx-auto">
      <div className="w-full md:w-[600px] aspect-square rounded-xl overflow-hidden shadow-lg border border-border bg-card">
        {!isClient || !puzzle || !game ? (
          <div className="w-full h-full flex items-center justify-center bg-muted/20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="w-full h-full relative">

            {showBoard ? (
              <Chessboard 
                options={{
                  id: `puzzles-board-${puzzle.id}`,
                  position: game.fen(),
                  onPieceDrop: onDrop,
                  boardOrientation: game.fen().split(' ')[1] === 'w' ? 'white' : 'black',
                  darkSquareStyle: { backgroundColor: '#779556' },
                  lightSquareStyle: { backgroundColor: '#ebecd0' },
                  animationDurationInMs: 300
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted/20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {error && error !== 'LIMIT_REACHED' && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <p className="text-red-500 font-semibold">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col justify-center space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Тактика</h2>
          <p className="text-muted-foreground">Решайте задачи подходящие под ваш рейтинг, чтобы улучшить свои навыки.</p>
        </div>

        {puzzle && (
          <div className="p-4 bg-muted/30 rounded-xl border border-muted">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Рейтинг задачи:</span>
              <span className="font-semibold flex items-center gap-1">
                <Trophy className="w-4 h-4 text-primary" />
                {puzzle.rating}
              </span>
            </div>
            {puzzle.themes && (
              <div className="mt-3 flex flex-wrap gap-2">
                {puzzle.themes.split(' ').slice(0, 3).map((t: string) => (
                  <span key={t} className="text-[10px] px-2 py-1 bg-background rounded-full border border-border text-muted-foreground uppercase tracking-wider">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="h-24 flex items-center justify-center rounded-xl border border-dashed border-muted-foreground/30">
          {solved && (
            <div className="flex flex-col items-center text-green-500 animate-in fade-in zoom-in">
              <CheckCircle2 className="w-8 h-8 mb-2" />
              <span className="font-bold">Верно! +10 рейтинга</span>
            </div>
          )}
          {wrong && (
            <div className="flex flex-col items-center text-red-500 animate-in fade-in zoom-in">
              <XCircle className="w-8 h-8 mb-2" />
              <span className="font-bold">Неверный ход. -10 рейтинга</span>
            </div>
          )}
          {!solved && !wrong && game && (
            <span className="text-muted-foreground font-medium">
              Ваш ход ({game.fen().split(' ')[1] === 'w' ? 'Белые' : 'Черные'})
            </span>
          )}
        </div>

        <button
          onClick={fetchPuzzle}
          disabled={loading || (!solved && !wrong)}
          className={`w-full py-4 rounded-xl font-bold transition-all ${
            solved || wrong 
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md' 
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Следующая задача'}
        </button>
      </div>
    </div>
  )
}
