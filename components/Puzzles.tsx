'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Loader2, Crown, Trophy, CheckCircle2, XCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { PUZZLE_THEMES, MAX_SELECTED_THEMES } from '@/lib/puzzleThemes'
import { NotificationBanner } from '@/components/NotificationBanner'
import { ResponsiveBoard } from '@/components/ResponsiveBoard'
import { EngineToggle } from '@/components/EngineToggle'

export function Puzzles({ 
  isPremium, 
  onPremiumClick,
  onRatingChange,
  apiEndpoint = '/api/puzzles',
  title = 'Задачи'
}: { 
  isPremium: boolean, 
  onPremiumClick: () => void,
  onRatingChange?: (newRating: number) => void,
  apiEndpoint?: string,
  title?: string
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
  const [ratingDiff, setRatingDiff] = useState<number | null>(null)
  const [positionHistory, setPositionHistory] = useState<string[]>([])
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(0)

  const [difficulty, setDifficulty] = useState('normal')
  const [selectedThemes, setSelectedThemes] = useState<string[]>([])
  const [bannerMessage, setBannerMessage] = useState<string | null>(null)
  const [bannerType, setBannerType] = useState<'error' | 'warning' | 'info'>('warning')
  const [showAllThemes, setShowAllThemes] = useState(false)

  const changeDifficulty = (newDiff: string) => {
    setDifficulty(newDiff)
    if (typeof window !== 'undefined') {
      localStorage.setItem('puzzle_difficulty', newDiff)
    }
    fetchPuzzle(newDiff, selectedThemes)
  }

  const getSolutionFens = (initialFen: string, movesStr: string) => {
    const fens = [initialFen]
    const tempGame = new Chess(initialFen)
    const moves = movesStr.split(' ')
    for (const m of moves) {
      try {
        tempGame.move({
          from: m.substring(0, 2),
          to: m.substring(2, 4),
          promotion: m.length > 4 ? m[4] : undefined
        })
        fens.push(tempGame.fen())
      } catch (e) {
        break
      }
    }
    return fens
  }

  const goToStart = () => {
    if (positionHistory.length > 0) {
      setCurrentHistoryIndex(0)
      setGame(new Chess(positionHistory[0]))
    }
  }

  const goToEnd = () => {
    if (positionHistory.length > 0) {
      const lastIdx = positionHistory.length - 1
      setCurrentHistoryIndex(lastIdx)
      setGame(new Chess(positionHistory[lastIdx]))
    }
  }

  const goBack = () => {
    if (currentHistoryIndex > 0) {
      const nextIdx = currentHistoryIndex - 1
      setCurrentHistoryIndex(nextIdx)
      setGame(new Chess(positionHistory[nextIdx]))
    }
  }

  const goForward = () => {
    if (currentHistoryIndex < positionHistory.length - 1) {
      const nextIdx = currentHistoryIndex + 1
      setCurrentHistoryIndex(nextIdx)
      setGame(new Chess(positionHistory[nextIdx]))
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!solved && !wrong) return

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goBack()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goForward()
      } else if (e.key === 'ArrowUp' || e.key === 'Home') {
        e.preventDefault()
        goToStart()
      } else if (e.key === 'ArrowDown' || e.key === 'End') {
        e.preventDefault()
        goToEnd()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [solved, wrong, currentHistoryIndex, positionHistory])

  const toggleTheme = (themeCode: string) => {
    let nextThemes = [...selectedThemes]
    if (selectedThemes.includes(themeCode)) {
      nextThemes = nextThemes.filter(t => t !== themeCode)
    } else {
      if (selectedThemes.length >= MAX_SELECTED_THEMES) {
        setBannerType('warning')
        setBannerMessage(`Можно выбрать не более ${MAX_SELECTED_THEMES} тем одновременно.`)
        return
      }
      nextThemes.push(themeCode)
    }
    setSelectedThemes(nextThemes)
    if (typeof window !== 'undefined') {
      localStorage.setItem('puzzleThemes', JSON.stringify(nextThemes))
    }
    fetchPuzzle(difficulty, nextThemes)
  }

  useEffect(() => {
    setIsClient(true)
    const savedDiff = typeof window !== 'undefined' ? localStorage.getItem('puzzle_difficulty') || 'normal' : 'normal'
    setDifficulty(savedDiff)
    
    let savedThemes: string[] = []
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('puzzleThemes')
        if (raw) savedThemes = JSON.parse(raw)
      } catch (e) {
        console.error('Error parsing saved themes', e)
      }
    }
    setSelectedThemes(savedThemes)
    fetchPuzzle(savedDiff, savedThemes)
  }, [])

  // Fetch puzzle
  const fetchPuzzle = async (diff = difficulty, themes = selectedThemes) => {
    setLoading(true)
    setError(null)
    setPuzzle(null)
    setSolved(false)
    setWrong(false)
    setMoveIndex(0)
    setRefreshKey(k => k + 1)
    setFailedSquares(null)
    setIsPlayingSolution(false)
    setRatingDiff(null)
    setPositionHistory([])
    setCurrentHistoryIndex(0)
    
    try {
      const themesParam = themes.length ? (apiEndpoint.includes('?') ? '&' : '?') + `themes=${themes.join(',')}` : ''
      const diffParam = apiEndpoint.includes('?') ? `&difficulty=${diff}` : `?difficulty=${diff}`
      
      const res = await fetch(`${apiEndpoint}${diffParam}${themesParam}`)
      if (res.status === 403) {
        setError('LIMIT_REACHED')
        setLoading(false)
        return
      }
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      
      if (data.error === 'NO_PUZZLES_FOR_THEMES') {
        setPuzzle(null)
        setGame(new Chess())
        setBannerType('info')
        setBannerMessage('Активных задач по выбранным темам нет — показана начальная позиция.')
        setLoading(false)
        return
      }

      if (data.error === 'ALL_SOLVED_FOR_THEMES') {
        setPuzzle(null)
        setGame(new Chess())
        setBannerType('info')
        setBannerMessage('Вы решили все задачи по этой теме!')
        setLoading(false)
        return
      }

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
      
      // Initialize position history
      const solutionFens = getSolutionFens(data.fen, data.moves)
      if (solutionFens.length > 1) {
        setPositionHistory(solutionFens.slice(0, 2))
        setCurrentHistoryIndex(1)
      } else {
        setPositionHistory([data.fen])
        setCurrentHistoryIndex(0)
      }

      setPlayerColor(newGame.fen().split(' ')[1] === 'w' ? 'white' : 'black')
      setGame(newGame)
    } catch (e) {
      console.error('Outer fetch error:', e)
      setError('Не удалось загрузить задачу')
    }
    setLoading(false)
  }

  const submitResult = async (isCorrect: boolean) => {
    if (!puzzle) return
    try {
      const res = await fetch('/api/puzzles/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCorrect, puzzleRating: puzzle?.rating, puzzleId: puzzle?.id })
      })
      const data = await res.json()
      if (data.ratingChange !== undefined) {
        setRatingDiff(data.ratingChange)
      }
      if (data.rating && onRatingChange) {
        onRatingChange(data.rating)
      }
    } catch (e) {}
  }

  const onDrop = ({ sourceSquare, targetSquare, piece }: any) => {
    if (isPlayingSolution || !game || !puzzle) return false

    if (solved || wrong) {
      // Free play / analysis mode after puzzle is finished
      try {
        const pieceStr = piece.pieceType || piece
        const isProm = 
          (pieceStr[1]?.toLowerCase() === 'p') && 
          ((pieceStr[0] === 'w' && targetSquare[1] === '8') || (pieceStr[0] === 'b' && targetSquare[1] === '1'));

        const testGame = new Chess(game.fen())
        const move = testGame.move({ 
          from: sourceSquare, 
          to: targetSquare, 
          promotion: isProm ? 'q' : undefined 
        })
        if (!move) return false
        
        const newFen = testGame.fen()
        setGame(new Chess(newFen))
        
        // Truncate history at the current viewing index and append the new FEN
        const nextHistory = positionHistory.slice(0, currentHistoryIndex + 1)
        nextHistory.push(newFen)
        setPositionHistory(nextHistory)
        setCurrentHistoryIndex(nextHistory.length - 1)
        return true
      } catch(e) {
        return false
      }
    }

    try {
      const pieceStr = piece.pieceType || piece
      const isProm = 
        (pieceStr[1]?.toLowerCase() === 'p') && 
        ((pieceStr[0] === 'w' && targetSquare[1] === '8') || (pieceStr[0] === 'b' && targetSquare[1] === '1'));
      
      const testGame = new Chess(game.fen())
      let move = null
      try {
         move = testGame.move({ 
           from: sourceSquare, 
           to: targetSquare, 
           promotion: isProm ? 'q' : undefined 
         })
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
        const playerMoveFen = testGame.fen()
        
        if (moveIndex === moves.length - 1) {
          // Solved
          const solutionFens = getSolutionFens(puzzle.fen, puzzle.moves)
          setPositionHistory(solutionFens)
          setCurrentHistoryIndex(solutionFens.length - 1)
          setSolved(true)
          submitResult(true)
        } else {
          // Next move by opponent
          setMoveIndex(m => m + 1)
          
          setPositionHistory(prev => [...prev, playerMoveFen])
          setCurrentHistoryIndex(prev => prev + 1)

          setTimeout(() => {
            try {
              const oppMove = moves[moveIndex + 1]
              testGame.move({ from: oppMove.substring(0, 2), to: oppMove.substring(2, 4), promotion: oppMove.length > 4 ? oppMove[4] : undefined })
              
              const oppMoveFen = testGame.fen()
              setGame(new Chess(testGame.fen()))
              setMoveIndex(m => m + 1)
              
              setPositionHistory(prev => [...prev, oppMoveFen])
              setCurrentHistoryIndex(prev => prev + 1)

              if (moveIndex + 1 === moves.length - 1) {
                const solutionFens = getSolutionFens(puzzle.fen, puzzle.moves)
                setPositionHistory(solutionFens)
                setCurrentHistoryIndex(solutionFens.length - 1)
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
        
        // Pre-populate history with the correct solution
        const solutionFens = getSolutionFens(puzzle.fen, puzzle.moves)
        setPositionHistory(solutionFens)
        setCurrentHistoryIndex(moveIndex)
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
    
    if (positionHistory.length > 1) {
      setCurrentHistoryIndex(1)
      setGame(new Chess(positionHistory[1]))
    }
    
    let i = 2
    const interval = setInterval(() => {
      if (i >= positionHistory.length) {
        clearInterval(interval)
        setIsPlayingSolution(false)
        return
      }
      setCurrentHistoryIndex(i)
      setGame(new Chess(positionHistory[i]))
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
      <div className="flex flex-col gap-3">
        <ResponsiveBoard>
          {!isClient || !puzzle || !game ? (
            <div className="w-full h-full flex items-center justify-center bg-muted/20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="w-full h-full relative">
              <Chessboard
                key={puzzle?.fen || 'start'}
                options={{
                  id: `board-${puzzle?.id || 'default'}`,
                  position: game.fen(),
                  boardOrientation: playerColor,
                  onPieceDrop: onDrop,
                  animationDurationInMs: 0,
                  darkSquareStyle: { backgroundColor: '#779556' },
                  lightSquareStyle: { backgroundColor: '#ebecd0' },
                  squareStyles: failedSquares ? {
                    [failedSquares.from]: { backgroundColor: 'rgba(239, 68, 68, 0.5)' },
                    [failedSquares.to]: { backgroundColor: 'rgba(239, 68, 68, 0.5)' }
                  } : {}
                }}
              />
              {error && error !== 'LIMIT_REACHED' && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <p className="text-red-500 font-semibold">{error}</p>
                </div>
              )}
            </div>
          )}
        </ResponsiveBoard>
        <EngineToggle fen={game ? game.fen() : null} />
      </div>
      
      <div className="flex-1 flex flex-col justify-center space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Тактика</h2>
          <p className="text-muted-foreground">Решайте задачи подходящие под ваш рейтинг, чтобы улучшить свои навыки.</p>
          
          <div className="flex gap-2 mt-4">
            <button onClick={() => changeDifficulty('easy')} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${difficulty === 'easy' ? 'bg-green-500 text-white shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>Изи</button>
            <button onClick={() => changeDifficulty('normal')} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${difficulty === 'normal' ? 'bg-blue-500 text-white shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>Нормал</button>
            <button onClick={() => changeDifficulty('hard')} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${difficulty === 'hard' ? 'bg-red-500 text-white shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>Хард</button>
          </div>

          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-muted-foreground">Темы задач ({selectedThemes.length}/3):</span>
              <button 
                onClick={() => setShowAllThemes(!showAllThemes)} 
                className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
              >
                {showAllThemes ? (
                  <>Свернуть <ChevronUp className="w-3.5 h-3.5" /></>
                ) : (
                  <>Показать все темы <ChevronDown className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>
            
            {selectedThemes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3 animate-in fade-in duration-200">
                {selectedThemes.map(code => {
                  const name = PUZZLE_THEMES.find(t => t.code === code)?.ru || code
                  return (
                    <button
                      key={code}
                      onClick={() => toggleTheme(code)}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1 shadow-sm"
                    >
                      {name} <span>×</span>
                    </button>
                  )
                })}
              </div>
            )}

            <div className={`transition-all duration-300 overflow-hidden ${showAllThemes ? 'max-h-[300px] overflow-y-auto pr-1' : 'max-h-0'}`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-1 bg-muted/20 rounded-xl border border-muted">
                {PUZZLE_THEMES.map(theme => {
                  const isSelected = selectedThemes.includes(theme.code)
                  return (
                    <button
                      key={theme.code}
                      onClick={() => toggleTheme(theme.code)}
                      className={`px-2 py-1.5 rounded-lg text-xs text-left font-medium transition-all ${
                        isSelected 
                          ? 'bg-primary text-primary-foreground shadow-sm' 
                          : 'bg-background hover:bg-muted text-foreground border border-border/60'
                      }`}
                    >
                      {theme.ru}
                    </button>
                  )
                })}
              </div>
            </div>
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
                {puzzle.themes.split(' ').slice(0, 3).map((t: string) => {
                  const name = PUZZLE_THEMES.find(pt => pt.code === t)?.ru || t
                  return (
                    <span key={t} className="text-[10px] px-2 py-1 bg-background rounded-full border border-border text-muted-foreground uppercase tracking-wider">
                      {name}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="min-h-24 p-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/30">
          {solved && (
            <div className="flex flex-col items-center text-green-500 animate-in fade-in zoom-in text-center px-4">
              <CheckCircle2 className="w-8 h-8 mb-2" />
              <span className="font-bold">
                Верно! {ratingDiff !== null ? (ratingDiff >= 0 ? `+${ratingDiff}` : ratingDiff) : '...'} рейтинга
              </span>
              <span className="text-sm text-foreground mt-2 font-medium">Ответ: {getSolutionSan()}</span>
            </div>
          )}
          {wrong && (
            <div className="flex flex-col items-center text-red-500 animate-in fade-in zoom-in text-center px-4">
              <XCircle className="w-8 h-8 mb-2" />
              <span className="font-bold">
                Неверный ход. {ratingDiff !== null ? (ratingDiff >= 0 ? `+${ratingDiff}` : ratingDiff) : '...'} рейтинга
              </span>
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

        {/* Navigation Controls */}
        {(solved || wrong) && positionHistory.length > 0 && (
          <div className="flex justify-center items-center gap-1.5 p-2 bg-muted/20 rounded-xl border border-muted select-none">
            <button 
              onClick={goToStart} 
              title="В начало"
              className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronsLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={goBack} 
              title="Назад"
              disabled={currentHistoryIndex === 0}
              className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-semibold px-3 text-muted-foreground min-w-[70px] text-center">
              Ход {currentHistoryIndex} / {positionHistory.length - 1}
            </span>
            <button 
              onClick={goForward} 
              title="Вперед"
              disabled={currentHistoryIndex === positionHistory.length - 1}
              className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button 
              onClick={goToEnd} 
              title="В конец"
              className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronsRight className="w-5 h-5" />
            </button>
          </div>
        )}

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
      <NotificationBanner 
        message={bannerMessage} 
        onClose={() => setBannerMessage(null)} 
        type={bannerType} 
      />
    </div>
  )
}
