'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Loader2, Crown, Trophy, CheckCircle2, XCircle } from 'lucide-react'

export function Puzzles({ isPremium, onPremiumClick }: { isPremium: boolean, onPremiumClick: () => void }) {
  const [puzzle, setPuzzle] = useState<any>(null)
  const [game, setGame] = useState(new Chess())
  const [fen, setFen] = useState('start')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [solved, setSolved] = useState(false)
  const [wrong, setWrong] = useState(false)
  const [moveIndex, setMoveIndex] = useState(0)

  // Fetch puzzle
  const fetchPuzzle = async () => {
    setLoading(true)
    setError(null)
    setSolved(false)
    setWrong(false)
    setMoveIndex(0)
    
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
      const newGame = new Chess(data.fen)
      
      // Make the first move automatically (opponent's move)
      const moves = data.moves.split(' ')
      if (moves.length > 0) {
        const move = moves[0]
        try {
          newGame.move({ from: move.substring(0, 2), to: move.substring(2, 4), promotion: move.length > 4 ? move[4] : undefined })
          setMoveIndex(1)
        } catch(e) {}
      }
      setGame(newGame)
      setFen(newGame.fen())
    } catch (e) {
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

  function onDrop(sourceSquare: string, targetSquare: string, piece: string) {
    if (solved || wrong || loading) return false;
    
    const move = {
      from: sourceSquare,
      to: targetSquare,
      promotion: piece[1].toLowerCase() ?? 'q',
    };

    const gameCopy = new Chess(game.fen());
    let moveResult = null;
    
    try {
      moveResult = gameCopy.move(move);
    } catch (e) {
      return false;
    }

    if (moveResult) {
      // Check if move is correct according to puzzle solution
      const expectedMoves = puzzle.moves.split(' ')
      const expectedMoveStr = expectedMoves[moveIndex]
      const userMoveStr = moveResult.lan || (move.from + move.to + (move.promotion !== 'q' ? move.promotion : ''))

      if (expectedMoveStr === userMoveStr || expectedMoveStr.startsWith(move.from + move.to)) {
        // Correct move
        setGame(gameCopy);
        setFen(gameCopy.fen());
        const nextIndex = moveIndex + 1;
        
        if (nextIndex >= expectedMoves.length) {
          // Puzzle solved!
          setSolved(true)
          submitResult(true)
        } else {
          // Opponent replies
          setMoveIndex(nextIndex + 1)
          setTimeout(() => {
            const oppMoveStr = expectedMoves[nextIndex]
            const oppGame = new Chess(gameCopy.fen())
            oppGame.move({ 
              from: oppMoveStr.substring(0, 2), 
              to: oppMoveStr.substring(2, 4), 
              promotion: oppMoveStr.length > 4 ? oppMoveStr[4] : undefined 
            })
            setGame(oppGame)
            setFen(oppGame.fen())
          }, 400)
        }
        return true;
      } else {
        // Wrong move
        setWrong(true)
        submitResult(false)
        return false;
      }
    }
    return false;
  }

  if (error === 'LIMIT_REACHED') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 bg-muted/20 rounded-xl border border-muted">
        <Crown className="h-16 w-16 text-yellow-500 mb-2" />
        <h2 className="text-2xl font-bold">Дневной лимит задач исчерпан</h2>
        <p className="text-muted-foreground max-w-md">
          Бесплатным пользователям доступно 10 задач в день. 
          Оформите Premium-подписку, чтобы решать неограниченное количество задач, получать доступ к приватным видео и выделяться в таблице лидеров!
        </p>
        <button 
          onClick={onPremiumClick}
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-8 rounded-full transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <Crown className="w-5 h-5" />
          Купить Premium
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl mx-auto">
      <div className="w-full md:w-[600px] aspect-square rounded-xl overflow-hidden shadow-lg border border-border bg-card">
        {loading && !puzzle ? (
          <div className="w-full h-full flex items-center justify-center bg-muted/20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="w-full h-full relative">
            <Chessboard 
              key={fen}
              position={fen} 
              onPieceDrop={onDrop}
              boardOrientation={fen.split(' ')[1] === 'w' ? 'white' : 'black'}
              customDarkSquareStyle={{ backgroundColor: '#779556' }}
              customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
              animationDuration={300}
            />
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
          {!solved && !wrong && (
            <span className="text-muted-foreground font-medium">
              Ваш ход ({fen.split(' ')[1] === 'w' ? 'Белые' : 'Черные'})
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
