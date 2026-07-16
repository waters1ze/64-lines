'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Timer, Trophy, Zap, AlertCircle, Play, RefreshCw, Star, Loader2, Users } from 'lucide-react'
import { ResponsiveBoard } from '@/components/ResponsiveBoard'
import { useRouter } from 'next/navigation'
import { MatchInviteModal } from '@/components/MatchInviteModal'
import { Button } from './ui/button'

export function PuzzleRush({ matchId, userId }: { matchId?: string, userId?: string }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [timeLeft, setTimeLeft] = useState(180) // 3 minutes
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [puzzle, setPuzzle] = useState<any>(null)
  const [game, setGame] = useState<Chess | null>(null)
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white')
  const [moveIndex, setMoveIndex] = useState(0)
  const [loadingPuzzle, setLoadingPuzzle] = useState(false)
  const [status, setStatus] = useState<'idle' | 'playing' | 'correct' | 'wrong' | 'finished'>('idle')
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)
  const [failedSquares, setFailedSquares] = useState<{ from: string; to: string } | null>(null)
  
  const [invites, setInvites] = useState<any[]>([])
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const router = useRouter()

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Load high score, leaderboard, and invites on mount
  useEffect(() => {
    fetchLeaderboard()
    if (!matchId) {
      fetchInvites()
    }
  }, [matchId])

  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true)
    try {
      const res = await fetch('/api/puzzle-rush/leaderboard')
      if (res.ok) {
        const data = await res.json()
        setLeaderboard(data.results || [])
      }
    } catch (e) {
      console.error(e)
    }
    setLoadingLeaderboard(false)
  }

  const fetchInvites = async () => {
    try {
      const res = await fetch('/api/puzzle-rush/match/invites')
      if (res.ok) {
        const data = await res.json()
        setInvites(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleRespond = async (matchIdToRespond: string, action: 'accept' | 'decline') => {
    try {
      const res = await fetch(`/api/puzzle-rush/match/${matchIdToRespond}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      if (res.ok) {
        if (action === 'accept') {
          router.push(`/?section=puzzles&matchId=${matchIdToRespond}`)
        } else {
          setInvites(prev => prev.filter(inv => inv.matchId !== matchIdToRespond))
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Timer logic
  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleFinish()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, timeLeft])

  const startRush = () => {
    setScore(0)
    setTimeLeft(180)
    setIsPlaying(true)
    setStatus('playing')
    loadNextPuzzle()
  }

  const handleFinish = async () => {
    setIsPlaying(false)
    setStatus('finished')
    if (timerRef.current) clearInterval(timerRef.current)

    // Submit score globally
    if (score > 0) {
      fetch('/api/puzzle-rush/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score })
      }).then(() => {
        fetchLeaderboard()
      })
    }

    // Submit match score
    if (matchId) {
      fetch(`/api/puzzle-rush/match/${matchId}/score`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score })
      }).then(() => {
        // Match score submitted
      })
    }
  }

  const loadNextPuzzle = async () => {
    setLoadingPuzzle(true)
    try {
      const res = await fetch('/api/puzzles?mode=rush&t=' + Date.now())
      if (!res.ok) {
        throw new Error('Failed to load puzzle')
      }
      const data = await res.json()
      if (data.error === 'LIMIT_REACHED') {
        throw new Error('Limit reached')
      }

      setPuzzle(data)
      const newGame = new Chess(data.fen)
      
      const moves = data.moves.split(' ')
      if (moves.length > 0) {
        const firstMove = moves[0]
        newGame.move({
          from: firstMove.substring(0, 2),
          to: firstMove.substring(2, 4),
          promotion: firstMove.length > 4 ? firstMove[4] : undefined
        })
        setMoveIndex(1)
      }

      setPlayerColor(newGame.fen().split(' ')[1] === 'w' ? 'white' : 'black')
      setGame(newGame)
      setStatus('playing')
    } catch (e) {
      console.error(e)
      setTimeout(loadNextPuzzle, 1000)
    }
    setLoadingPuzzle(false)
  }

  const onDrop = ({ sourceSquare, targetSquare, piece }: { sourceSquare: string, targetSquare: string, piece: string }) => {
    if (status !== 'playing' || !game || !puzzle || loadingPuzzle) return false

    try {
      const pieceStr = (piece as any).pieceType || piece
      const isProm =
        pieceStr[1]?.toLowerCase() === 'p' &&
        ((pieceStr[0] === 'w' && targetSquare[1] === '8') ||
          (pieceStr[0] === 'b' && targetSquare[1] === '1'))

      const testGame = new Chess(game.fen())
      let move = null
      try {
        move = testGame.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: isProm ? 'q' : undefined
        })
      } catch (err) {
        move = null
      }

      if (!move) {
        setFailedSquares({ from: sourceSquare, to: targetSquare })
        setTimeout(() => setFailedSquares(null), 500)
        return false
      }

      const moves = puzzle.moves.split(' ')
      if (moveIndex < moves.length && moves[moveIndex] === move.lan) {
        setGame(new Chess(testGame.fen()))

        if (moveIndex === moves.length - 1) {
          setScore((s) => s + 1)
          setStatus('correct')
          setTimeout(() => {
            loadNextPuzzle()
          }, 400)
        } else {
          const nextIndex = moveIndex + 1
          setMoveIndex(nextIndex + 1)
          
          setTimeout(() => {
            try {
              const oppMove = moves[nextIndex]
              testGame.move({
                from: oppMove.substring(0, 2),
                to: oppMove.substring(2, 4),
                promotion: oppMove.length > 4 ? oppMove[4] : undefined
              })
              setGame(new Chess(testGame.fen()))
              
              if (nextIndex === moves.length - 1) {
                setScore((s) => s + 1)
                setStatus('correct')
                setTimeout(() => {
                  loadNextPuzzle()
                }, 400)
              }
            } catch (e) {
              console.error(e)
            }
          }, 300)
        }
        return true
      } else {
        setFailedSquares({ from: sourceSquare, to: targetSquare })
        setStatus('wrong')
        setTimeout(() => {
          setFailedSquares(null)
          loadNextPuzzle()
        }, 500)
        return false
      }
    } catch (e) {
      console.error(e)
      return false
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const myHighScore = leaderboard.find((item) => item.role === 'STUDENT')?.score || 0

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-card border border-border/60 rounded-2xl p-6 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500 animate-pulse" />
            <span>Puzzle Rush</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Решите как можно больше задач за 3 минуты. За ошибки нет штрафа по рейтингу, но вы теряете время!
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <span className="text-xs text-muted-foreground block uppercase font-semibold">Лучший результат</span>
            <span className="text-2xl font-black text-yellow-500 flex items-center justify-center gap-1">
              <Trophy className="w-5 h-5" />
              {myHighScore || 0}
            </span>
          </div>
        </div>
      </div>

      {!matchId && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Многопользовательский режим</h3>
            <Button onClick={() => setIsInviteModalOpen(true)} className="flex items-center gap-2">
              <Users className="w-4 h-4" /> Пригласить соперников
            </Button>
          </div>
          
          {invites.length > 0 && (
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
              <h4 className="font-semibold text-blue-800 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> У вас есть активные вызовы!
              </h4>
              <div className="space-y-2">
                {invites.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm">
                    <span className="text-sm">
                      <span className="font-semibold">{inv.match.creator.name}</span> вызывает вас на матч!
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleRespond(inv.matchId, 'accept')} className="bg-blue-600 hover:bg-blue-700 text-white">Принять</Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => handleRespond(inv.matchId, 'decline')}>Отклонить</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Game Area */}
        <div className="lg:col-span-2 space-y-4">
          {!isPlaying && status !== 'finished' ? (
            <div className="bg-card border rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px] shadow-sm">
              <Zap className="w-16 h-16 text-yellow-500 fill-yellow-500 mb-4 animate-bounce" />
              <h3 className="text-xl font-bold text-foreground">Готовы к штурму задач?</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-2 mb-6">
                Таймер запустится сразу после нажатия кнопки. Постарайтесь действовать максимально быстро!
              </p>
              <button
                onClick={startRush}
                className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold rounded-xl shadow-lg shadow-yellow-500/20 hover:scale-105 transition active:scale-95 flex items-center gap-2 text-lg"
              >
                <Play className="w-5 h-5 fill-black" />
                Начать Штурм
              </button>
            </div>
          ) : status === 'finished' ? (
            <div className="bg-card border rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px] shadow-sm">
              <Trophy className="w-16 h-16 text-yellow-500 mb-4" />
              <h3 className="text-2xl font-black text-foreground">Время вышло!</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                Вы успешно решили <span className="font-bold text-foreground text-lg">{score}</span> задач.
              </p>
              {!matchId && (
                <button
                  onClick={startRush}
                  className="px-6 py-3 bg-foreground text-background font-bold rounded-xl hover:bg-foreground/90 transition flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Попробовать еще раз
                </button>
              )}
            </div>
          ) : (
            <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-4 relative">
              <div className="flex items-center justify-between bg-muted/50 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-muted-foreground" />
                  <span className={`font-mono text-lg font-bold ${timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-foreground'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-lg font-black text-foreground">Очки: {score}</span>
                </div>
              </div>

              <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${timeLeft < 30 ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${(timeLeft / 180) * 100}%` }}
                />
              </div>

              <ResponsiveBoard
                className={`border-4 transition-all duration-200 ${
                  status === 'correct' ? 'border-emerald-500 shadow-lg shadow-emerald-500/20' :
                  status === 'wrong' ? 'border-red-500 shadow-lg shadow-red-500/20 animate-shake' :
                  'border-border'
                }`}
              >
                {loadingPuzzle && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex items-center justify-center z-10">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  </div>
                )}
                {game && (
                  <Chessboard
                    key={puzzle?.fen || 'rush-start'}
                    options={{
                      id: `rush-board-${puzzle?.id || 'default'}`,
                      position: game.fen(),
                      boardOrientation: playerColor,
                      onPieceDrop: onDrop,
                      animationDurationInMs: 0,
                      darkSquareStyle: { backgroundColor: '#b58863' },
                      lightSquareStyle: { backgroundColor: '#f0d9b5' },
                      squareStyles: failedSquares ? {
                        [failedSquares.from]: { backgroundColor: 'rgba(239, 68, 68, 0.5)' },
                        [failedSquares.to]: { backgroundColor: 'rgba(239, 68, 68, 0.5)' }
                      } : {}
                    }}
                  />
                )}
              </ResponsiveBoard>
            </div>
          )}
        </div>

        {/* Right Column: Leaderboard */}
        <div className="space-y-4">
          <div className="bg-card border rounded-2xl p-4 shadow-sm h-full">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5 mb-4">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span>Глобальный Лидерборд</span>
            </h3>

            {loadingLeaderboard ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground flex flex-col items-center">
                <Star className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <span>Рекордов пока нет. Станьте первым!</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {leaderboard.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                      index === 0 ? 'bg-yellow-500/10 border-yellow-500/30' :
                      index === 1 ? 'bg-slate-400/10 border-slate-400/20' :
                      index === 2 ? 'bg-amber-600/10 border-amber-600/20' :
                      'bg-muted/30 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-muted-foreground w-4 text-center">
                        {index + 1}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-foreground block">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(item.playedAt).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                    </div>
                    <span className="font-black text-sm text-foreground flex items-center gap-1 bg-card px-2 py-0.5 rounded-lg border border-border/80 shadow-xs">
                      <Zap className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      {item.score}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <MatchInviteModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
    </div>
  )
}
