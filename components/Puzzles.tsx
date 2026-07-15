'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Loader2, Crown, Trophy, CheckCircle2, XCircle } from 'lucide-react'

export function Puzzles({ 
  isPremium, 
  onPremiumClick,
  onRatingChange,
}: { 
  isPremium: boolean, 
  onPremiumClick: () => void,
  onRatingChange?: (newRating: number) => void 
}) {
  const [puzzle, setPuzzle] = useState<any>(null)
  const [game, setGame] = useState<Chess>(new Chess())
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [solved, setSolved] = useState(false)
  const [wrong, setWrong] = useState(false)
  const [moveIndex, setMoveIndex] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isClient, setIsClient] = useState(false)
  const [failedSquares, setFailedSquares] = useState<{from: string, to: string} | null>(null)
  const [isPlayingSolution, setIsPlayingSolution] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const [difficulty, setDifficulty] = useState('normal')

  // Fetch puzzle
  const fetchPuzzle = async (diff = difficulty) => {
    setLoading(true)
    setError(null)
    setSolved(false)
    setWrong(false)
    setMoveIndex(0)
    setRefreshKey(k => k + 1)
    setFailedSquares(null)
    setIsPlayingSolution(false)
    
    try {
      const res = await fetch(`/api/puzzles?difficulty=${diff}`)
      if (res.status === 403) {
        setError('LIMIT_REACHED')
        setLoading(false)
        return
      }
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      
      setPuzzle(data)
      let newGame = new Chess()
      console.log('Loaded puzzle data:', data)
      try {
        newGame = new Chess(data.fen)
        console.log('FEN loaded successfully:', newGame.fen())
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
      setPlayerColor(newGame.fen().split(' ')[1] === 'w' ? 'white' : 'black')
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
      const res = await fetch('/api/puzzles/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCorrect, puzzleRating: puzzle?.rating })
      })
      const data = await res.json()
      if (data.rating && onRatingChange) {
        onRatingChange(data.rating)
      }
    } catch (e) {}
  }

  const onDrop = ({ sourceSquare, targetSquare, piece }: any) => {
    if (solved || wrong || isPlayingSolution || !game) return false

    try {
      const pieceStr = piece.pieceType || piece
      
      const testGame = new Chess(game.fen())
      let move = null
      try {
         move = testGame.move({ from: sourceSquare, to: targetSquare, promotion: pieceStr[1]?.toLowerCase() ?? 'q' })
      } catch(e) {
         move = null
      }

      if (!move) {
        setFailedSquares({ from: sourceSquare, to: targetSquare })
        setTimeout(() => setFailedSquares(null), 1000)
        return false
      }

      setGame(new Chess(testGame.fen()))

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
            try {
              const oppMove = moves[moveIndex + 1]
              testGame.move({ from: oppMove.substring(0, 2), to: oppMove.substring(2, 4), promotion: oppMove.length > 4 ? oppMove[4] : undefined })
              setGame(new Chess(testGame.fen()))
              setMoveIndex(m => m + 1)
              if (moveIndex + 1 === moves.length - 1) {
                setSolved(true)
                submitResult(true)
              }
            } catch(e) {}
          }, 500)
        }
        return true
      } else {
        // Wrong move
        setGame(new Chess(game.fen()))
        setFailedSquares({ from: sourceSquare, to: targetSquare })
        setTimeout(() => setFailedSquares(null), 1000)
        setWrong(true)
        submitResult(false)
        return false
      }
    } catch (e) {
      return false
    }
  }

  const getSolutionSan = () => {
    if (!puzzle) return ''
    const temp = new Chess(puzzle.fen)
    const moves = puzzle.moves.split(' ')
    const sanMoves = []
    let fullMoveNumber = parseInt(temp.fen().split(' ')[5]) || 1
    
    for (let i = 0; i < moves.length; i++) {
      try {
        const m = moves[i]
        const turn = temp.turn()
        const res = temp.move({ from: m.substring(0, 2), to: m.substring(2, 4), promotion: m.length > 4 ? m[4] : undefined })
        
        if (i > 0) {
          if (turn === 'w') {
            sanMoves.push(`${fullMoveNumber}. ${res.san}`)
          } else {
            if (i === 1) sanMoves.push(`${fullMoveNumber}... ${res.san}`)
            else sanMoves.push(`${res.san}`)
          }
        }
        
        if (turn === 'b') fullMoveNumber++
      } catch(e) {
        if (i > 0) sanMoves.push(moves[i])
      }
    }
    return sanMoves.join(' ')
  }

  const playSolution = () => {
    setIsPlayingSolution(true)
    setFailedSquares(null)
    
    const newGame = new Chess(puzzle.fen)
    const moves = puzzle.moves.split(' ')
    if (moves.length > 0) {
      const opp = moves[0]
      try { newGame.move({ from: opp.substring(0, 2), to: opp.substring(2, 4), promotion: opp.length > 4 ? opp[4] : undefined }) } catch(e) {}
    }
    setGame(new Chess(newGame.fen()))
    
    let i = 1
    const interval = setInterval(() => {
      if (i >= moves.length) {
        clearInterval(interval)
        setIsPlayingSolution(false)
        return
      }
      const m = moves[i]
      try { 
        newGame.move({ from: m.substring(0, 2), to: m.substring(2, 4), promotion: m.length > 4 ? m[4] : undefined }) 
        setGame(new Chess(newGame.fen()))
      } catch(e) {}
      i++
    }, 1000)
  }


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
      <div className="flex flex-col">
        <div className="w-full md:w-[600px] aspect-square rounded-xl overflow-hidden shadow-lg border border-border bg-card">
          {!isClient || !puzzle || !game ? (
            <div className="w-full h-full flex items-center justify-center bg-muted/20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="w-full h-full relative">
            <Chessboard 
              id={`puzzles-board`}
              position={game.fen()}
              onPieceDrop={onDrop}
              boardOrientation={playerColor}
              customDarkSquareStyle={{ backgroundColor: '#779556' }}
              customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
              animationDuration={300}
              customSquareStyles={failedSquares ? {
                [failedSquares.from]: { backgroundColor: 'rgba(239, 68, 68, 0.5)' },
                [failedSquares.to]: { backgroundColor: 'rgba(239, 68, 68, 0.5)' }
              } : {}}
            />
            {error && error !== 'LIMIT_REACHED' && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <p className="text-red-500 font-semibold">{error}</p>
              </div>
            )}
          </div>
          )}
        </div>
        <div className="w-full md:w-[600px] p-4 bg-muted text-xs font-mono overflow-auto break-all mt-4 rounded-xl">
          <p>Debug Info:</p>
          <p>Puzzle FEN: {puzzle?.fen}</p>
          <p>Game FEN: {game?.fen()}</p>
          <p>Player Color: {playerColor}</p>
          <p>Puzzle Moves: {puzzle?.moves}</p>
          <p>Move Index: {moveIndex}</p>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col justify-center space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Тактика</h2>
          <p className="text-muted-foreground">Решайте задачи подходящие под ваш рейтинг, чтобы улучшить свои навыки.</p>
          
          <div className="flex gap-2 mt-4">
            <button onClick={() => { setDifficulty('easy'); fetchPuzzle('easy'); }} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${difficulty === 'easy' ? 'bg-green-500 text-white shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>Изи</button>
            <button onClick={() => { setDifficulty('normal'); fetchPuzzle('normal'); }} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${difficulty === 'normal' ? 'bg-blue-500 text-white shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>Нормал</button>
            <button onClick={() => { setDifficulty('hard'); fetchPuzzle('hard'); }} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${difficulty === 'hard' ? 'bg-red-500 text-white shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>Хард</button>
          </div>
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

        <div className="min-h-24 p-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/30">
          {solved && (
            <div className="flex flex-col items-center text-green-500 animate-in fade-in zoom-in text-center px-4">
              <CheckCircle2 className="w-8 h-8 mb-2" />
              <span className="font-bold">Верно! +10 рейтинга</span>
              <span className="text-sm text-foreground mt-2 font-medium">Ответ: {getSolutionSan()}</span>
            </div>
          )}
          {wrong && (
            <div className="flex flex-col items-center text-red-500 animate-in fade-in zoom-in text-center px-4">
              <XCircle className="w-8 h-8 mb-2" />
              <span className="font-bold">Неверный ход. -10 рейтинга</span>
              <span className="text-sm text-foreground mt-2 font-medium">Правильное решение: {getSolutionSan()}</span>
              <button 
                onClick={playSolution} 
                disabled={isPlayingSolution}
                className="mt-4 px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isPlayingSolution ? 'Показываем...' : 'Посмотреть на доске'}
              </button>
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
