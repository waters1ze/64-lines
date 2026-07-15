'use client'

/**
 * OpeningTrainer — component that:
 *  1. Shows a list of opening cards fetched from /api/openings.
 *  2. When the user clicks "Тренировать", enters training mode:
 *     – Parses the stored PGN tree (JSON-encoded GameTree from PgnBoard).
 *     – Replays the main line from the start position.
 *     – Shows the opponent's move automatically, then waits for the user's reply.
 *     – Checks if the move matches the expected reply in the tree.
 *     – Gives feedback (✓ correct / ✗ wrong + shows expected move) and advances.
 *     – On completion shows a score.
 *  3. Includes EngineToggle and uses ResponsiveBoard for the board.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import {
  BookOpen, Play, RotateCcw, ChevronRight, ChevronLeft,
  CheckCircle2, XCircle, Trophy, Loader2, RefreshCw, ArrowLeft
} from 'lucide-react'
import { ResponsiveBoard } from '@/components/ResponsiveBoard'
import { EngineToggle } from '@/components/EngineToggle'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface TreeNode {
  san: string
  comment: string
  children: TreeNode[]
}
interface GameTree {
  children: TreeNode[]
  comment: string
}

interface Opening {
  id: string
  title: string
  pgn: string
  createdAt: string
}

type TrainStatus = 'idle' | 'opponent' | 'waiting' | 'correct' | 'wrong' | 'done'

// ─── Helpers ───────────────────────────────────────────────────────────────────
/** Walk a GameTree following an array of SAN moves, returning children at that node. */
function walkTree(tree: GameTree, path: string[]): TreeNode[] {
  let nodes = tree.children
  for (const san of path) {
    const node = nodes.find(n => n.san === san)
    if (!node) return []
    nodes = node.children
  }
  return nodes
}

/** Build a Chess object by replaying the given SAN path from the start position. */
function buildGame(sanPath: string[]): Chess {
  const g = new Chess()
  for (const san of sanPath) {
    try { g.move(san) } catch (_) { break }
  }
  return g
}

/** Extract the main line (first child at each level) as an array of SAN moves. */
function mainLine(tree: GameTree): string[] {
  const line: string[] = []
  let nodes = tree.children
  while (nodes.length > 0) {
    line.push(nodes[0].san)
    nodes = nodes[0].children
  }
  return line
}

/** Parse the stored PGN field — it may be a JSON-encoded GameTree or a raw PGN string. */
function parsePgn(raw: string): GameTree | null {
  // Try JSON first (PgnBoard saves trees as JSON)
  try {
    const parsed = JSON.parse(raw)
    if (parsed && Array.isArray(parsed.children)) return parsed as GameTree
  } catch (_) {}

  // Fallback: parse as a plain PGN (only main line, no variants)
  try {
    const g = new Chess()
    g.loadPgn(raw)
    const history = g.history()
    // Convert to a minimal GameTree (linear — no branches)
    let tree: GameTree = { children: [], comment: '' }
    let nodes = tree.children
    for (const san of history) {
      const node: TreeNode = { san, comment: '', children: [] }
      nodes.push(node)
      nodes = node.children
    }
    return tree
  } catch (_) {}

  return null
}

// ─── Sub-component: Opening card list ─────────────────────────────────────────
function OpeningCard({
  opening,
  onTrain,
}: {
  opening: Opening
  onTrain: (opening: Opening) => void
}) {
  const tree = parsePgn(opening.pgn)
  const moves = tree ? mainLine(tree) : []

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm flex flex-col gap-3 hover:border-primary/40 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground leading-tight">{opening.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {moves.length > 0 ? `${moves.length} ход${moves.length % 10 === 1 && moves.length !== 11 ? '' : moves.length % 10 >= 2 && moves.length % 10 <= 4 && (moves.length < 10 || moves.length > 20) ? 'а' : 'ов'}` : 'Нет ходов'}
            </p>
          </div>
        </div>
      </div>

      {/* Mini move preview */}
      {moves.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {moves.slice(0, 10).map((san, i) => (
            <span key={i} className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
              {Math.floor(i / 2) + 1}{i % 2 === 0 ? '.' : '...'}{san}
            </span>
          ))}
          {moves.length > 10 && (
            <span className="text-[10px] text-muted-foreground">+{moves.length - 10} ещё</span>
          )}
        </div>
      )}

      <button
        onClick={() => onTrain(opening)}
        disabled={moves.length === 0}
        className="mt-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-background font-semibold text-sm rounded-xl hover:bg-foreground/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Play className="w-4 h-4 fill-current" />
        Тренировать
      </button>
    </div>
  )
}

// ─── Sub-component: Training Mode ─────────────────────────────────────────────
function TrainingMode({
  opening,
  onBack,
}: {
  opening: Opening
  onBack: () => void
}) {
  const tree = parsePgn(opening.pgn)!
  const line = mainLine(tree)  // main line for sequential training

  // Which side does the user play? Determined by who moves on the first "user" move.
  // Typically in an opening the user plays one side throughout the main line.
  // We'll detect: the tree starts from the initial position (White to move).
  // If the first move is White's (index 0), we'll make the user play White, opponent plays Black.
  // For a typical opening like Sicilian (1.e4 c5), teacher saves starting from 1.e4 onwards:
  // the opponent (book side) plays 1.e4, user replies 1...c5, etc.
  // We'll use a simple heuristic: user plays the *second* color seen, or we let them choose.
  // For simplicity: user plays the side that makes the second move overall.
  const firstMoveColor = 'w' // white always moves first in a game

  // User side: alternate on each move. We make it configurable.
  const [userSide, setUserSide] = useState<'white' | 'black' | null>(null)

  // Training state
  const [stepIndex, setStepIndex] = useState(0) // current position in `line`
  const [game, setGame] = useState(() => new Chess())
  const [status, setStatus] = useState<TrainStatus>('idle')
  const [wrongMove, setWrongMove] = useState<{ expected: string; got: string } | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [expectedMoveUci, setExpectedMoveUci] = useState<string | null>(null)

  const opponentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentFen = game.fen()
  const currentTurn = game.turn() === 'w' ? 'white' : 'black'
  const isUserTurn = userSide !== null && currentTurn === userSide

  // ── Initialise / reset ──
  const initTraining = useCallback((side: 'white' | 'black') => {
    setUserSide(side)
    setGame(new Chess())
    setStepIndex(0)
    setStatus('idle')
    setWrongMove(null)
    setScore({ correct: 0, total: 0 })
  }, [])

  // ── Advance opponent move ──
  const playOpponentMove = useCallback((idx: number, g: Chess) => {
    if (idx >= line.length) {
      setStatus('done')
      return
    }
    setStatus('opponent')
    opponentTimerRef.current = setTimeout(() => {
      const san = line[idx]
      try {
        const newG = new Chess(g.fen())
        newG.move(san)
        setGame(newG)
        setStepIndex(idx + 1)
        if (idx + 1 >= line.length) {
          setStatus('done')
        } else {
          setStatus('waiting')
          // Pre-compute expected move UCI for highlighting (optional)
          const expected = line[idx + 1]
          const tempG = new Chess(newG.fen())
          const mv = tempG.move(expected)
          if (mv) setExpectedMoveUci(`${mv.from}${mv.to}`)
        }
      } catch (_) {
        setStatus('done')
      }
    }, 600)
  }, [line])

  // Start training after side selection
  useEffect(() => {
    if (userSide === null) return
    const g = new Chess()
    setGame(g)
    setStepIndex(0)
    setStatus('idle')

    // If user plays white, they move first — status 'waiting'
    // If user plays black, opponent (white) moves first automatically
    if (userSide === 'black') {
      // opponent plays first move
      setTimeout(() => playOpponentMove(0, g), 400)
    } else {
      setStatus('waiting')
      setExpectedMoveUci(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSide])

  useEffect(() => {
    return () => {
      if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current)
    }
  }, [])

  // ── Handle user piece drop ──
  const onDrop = useCallback(({ sourceSquare, targetSquare }: any) => {
    if (status !== 'waiting' || stepIndex >= line.length) return false

    const expectedSan = line[stepIndex]
    const newG = new Chess(game.fen())
    let move: ReturnType<Chess['move']> | null = null
    try {
      move = newG.move({ from: sourceSquare, to: targetSquare, promotion: 'q' })
    } catch (_) {
      return false
    }
    if (!move) return false

    // Compare SAN or UCI
    const expectedGame = new Chess(game.fen())
    let expectedMove: ReturnType<Chess['move']> | null = null
    try { expectedMove = expectedGame.move(expectedSan) } catch (_) {}

    const isCorrect = expectedMove &&
      move.from === expectedMove.from &&
      move.to === expectedMove.to

    setScore(s => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }))

    if (isCorrect) {
      setGame(newG)
      setStatus('correct')
      const nextIdx = stepIndex + 1
      setStepIndex(nextIdx)
      setTimeout(() => {
        if (nextIdx >= line.length) {
          setStatus('done')
        } else {
          // Play opponent's next move
          playOpponentMove(nextIdx, newG)
        }
      }, 800)
    } else {
      // Show wrong move then revert
      setWrongMove({ expected: expectedSan, got: move.san })
      setStatus('wrong')
      setTimeout(() => {
        setStatus('waiting')
        setWrongMove(null)
      }, 1500)
    }

    return isCorrect
  }, [status, stepIndex, line, game, playOpponentMove])

  // ─── Render: side selection ───
  if (userSide === null) {
    return (
      <div className="flex flex-col items-center gap-6 py-10 max-w-md mx-auto text-center">
        <BookOpen className="w-12 h-12 text-primary" />
        <div>
          <h2 className="text-xl font-bold">{opening.title}</h2>
          <p className="text-muted-foreground text-sm mt-1">Выберите, за какую сторону вы будете играть</p>
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={() => initTraining('white')}
            className="flex-1 py-3 border-2 rounded-xl font-semibold text-sm hover:border-foreground transition flex flex-col items-center gap-1"
          >
            <span className="text-2xl">♔</span>
            Белыми
          </button>
          <button
            onClick={() => initTraining('black')}
            className="flex-1 py-3 border-2 rounded-xl font-semibold text-sm hover:border-foreground transition flex flex-col items-center gap-1"
          >
            <span className="text-2xl">♚</span>
            Чёрными
          </button>
        </div>
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Назад к дебютам
        </button>
      </div>
    )
  }

  // ─── Render: training in progress ───
  const progress = line.length > 0 ? (stepIndex / line.length) * 100 : 0

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full">
      {/* Left: board column */}
      <div className="flex flex-col gap-3">
        <ResponsiveBoard
          className={`border-4 transition-all duration-200 ${
            status === 'correct' ? 'border-emerald-500 shadow-emerald-500/20' :
            status === 'wrong'   ? 'border-red-500 shadow-red-500/20' :
            status === 'done'    ? 'border-primary' : 'border-border'
          }`}
        >
          {status === 'opponent' && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/30 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}
          <Chessboard
            key={`trainer-${stepIndex}`}
            options={{
              id: `opening-trainer-${opening.id}`,
              position: currentFen,
              boardOrientation: userSide,
              onPieceDrop: ({ sourceSquare, targetSquare }) => Boolean(onDrop({ sourceSquare: sourceSquare as string, targetSquare: targetSquare as string })),
              animationDurationInMs: 150,
              darkSquareStyle: { backgroundColor: '#779556' },
              lightSquareStyle: { backgroundColor: '#ebecd0' },
              arePiecesDraggable: status === 'waiting',
            }}
          />
        </ResponsiveBoard>

        <EngineToggle fen={currentFen} />
      </div>

      {/* Right: info panel */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Header */}
        <div>
          <button
            onClick={onBack}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Назад
          </button>
          <h2 className="text-xl font-bold">{opening.title}</h2>
          <p className="text-sm text-muted-foreground">
            Вы играете за {userSide === 'white' ? 'белых' : 'чёрных'} · Ход {Math.ceil(stepIndex / 2)} из {Math.ceil(line.length / 2)}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status feedback */}
        {status === 'done' ? (
          <div className="bg-card border rounded-2xl p-6 text-center flex flex-col items-center gap-3">
            <Trophy className="w-10 h-10 text-yellow-500" />
            <h3 className="text-lg font-bold">Дебют пройден!</h3>
            <p className="text-muted-foreground text-sm">
              Правильно: <strong>{score.correct}</strong> / {score.total}
              {score.correct === score.total ? ' — идеально!' : ''}
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => initTraining(userSide)}
                className="flex items-center gap-2 px-4 py-2 bg-foreground text-background font-semibold text-sm rounded-xl hover:bg-foreground/90 transition"
              >
                <RefreshCw className="w-4 h-4" /> Попробовать снова
              </button>
              <button
                onClick={onBack}
                className="px-4 py-2 border rounded-xl text-sm font-medium hover:bg-muted transition"
              >
                К дебютам
              </button>
            </div>
          </div>
        ) : status === 'correct' ? (
          <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Правильно!</p>
          </div>
        ) : status === 'wrong' && wrongMove ? (
          <div className="flex flex-col gap-1 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">Неверный ход</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Правильный ход: <code className="font-mono bg-background px-1 rounded">{wrongMove.expected}</code>
            </p>
          </div>
        ) : status === 'opponent' ? (
          <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Соперник думает...</p>
          </div>
        ) : status === 'waiting' ? (
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm font-semibold mb-1">
              {currentTurn === 'white' ? '♔ Ход белых' : '♚ Ход чёрных'} — ваш ход
            </p>
            <p className="text-xs text-muted-foreground">Перетащите фигуру или щёлкните по ней</p>
          </div>
        ) : null}

        {/* Move list */}
        <div className="bg-card border rounded-xl p-4 flex-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Линия дебюта
          </p>
          <div className="flex flex-wrap gap-1">
            {line.map((san, i) => (
              <span
                key={i}
                className={`text-xs font-mono px-1.5 py-0.5 rounded transition-colors ${
                  i < stepIndex
                    ? 'bg-primary text-primary-foreground'
                    : i === stepIndex
                    ? 'bg-muted border-2 border-primary text-foreground font-bold'
                    : 'bg-muted/40 text-muted-foreground'
                }`}
              >
                {Math.floor(i / 2) + 1}{i % 2 === 0 ? '.' : '...'}{san}
              </span>
            ))}
            {line.length === 0 && (
              <span className="text-xs text-muted-foreground">Нет ходов в этом дебюте</span>
            )}
          </div>
        </div>

        {/* Restart */}
        <button
          onClick={() => initTraining(userSide)}
          className="flex items-center justify-center gap-2 border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition"
        >
          <RotateCcw className="w-4 h-4" /> Начать заново
        </button>
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────────
export function OpeningTrainer() {
  const [openings, setOpenings] = useState<Opening[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trainingOpening, setTrainingOpening] = useState<Opening | null>(null)

  useEffect(() => {
    fetch('/api/openings')
      .then(r => r.json())
      .then((data: Opening[]) => {
        setOpenings(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Не удалось загрузить дебюты')
        setLoading(false)
      })
  }, [])

  if (trainingOpening) {
    return (
      <div className="w-full">
        <TrainingMode opening={trainingOpening} onBack={() => setTrainingOpening(null)} />
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Тренажёр дебютов</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Выберите дебют и потренируйтесь воспроизводить его ходы. Движок оценивает каждую позицию.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <XCircle className="w-10 h-10 text-destructive" />
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-primary hover:underline"
          >
            Обновить страницу
          </button>
        </div>
      )}

      {!loading && !error && openings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground" />
          <div>
            <p className="font-semibold">Нет сохранённых дебютов</p>
            <p className="text-sm text-muted-foreground mt-1">
              Попросите тренера добавить дебюты в разделе «Мои дебюты»
            </p>
          </div>
        </div>
      )}

      {!loading && !error && openings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {openings.map(op => (
            <OpeningCard key={op.id} opening={op} onTrain={() => setTrainingOpening(op)} />
          ))}
        </div>
      )}
    </div>
  )
}
