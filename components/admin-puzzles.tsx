'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Chess } from 'chess.js'
import dynamic from 'next/dynamic'
const Chessboard = dynamic(() => import('react-chessboard').then(m => m.Chessboard), { ssr: false })
import { ArrowLeft, Save, Loader2, Upload } from 'lucide-react'
import { ResponsiveBoard } from '@/components/ResponsiveBoard'
import { EngineToggle } from '@/components/EngineToggle'

export function AdminPuzzles({ onBack }: { onBack: () => void }) {
  const [pgn, setPgn] = useState('')
  const [rating, setRating] = useState('1200')
  const [themes, setThemes] = useState('custom')
  const [previewFen, setPreviewFen] = useState('')
  const [movesList, setMovesList] = useState<string[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const parsePgn = () => {
    setError('')
    setSuccess('')
    setPreviewFen('')
    setMovesList([])

    try {
      const chess = new Chess()
      // To get the FEN, we load the PGN
      chess.loadPgn(pgn)
      
      const history = chess.history({ verbose: true })
      if (history.length === 0) {
        throw new Error('В PGN нет ходов')
      }

      // If the PGN has a starting FEN, chess.js will load it. 
      // But we need the initial FEN *before* the moves are played to show the puzzle start position.
      const initialChess = new Chess()
      const headerFen = chess.header().FEN
      if (headerFen) {
        initialChess.load(headerFen)
      }

      setPreviewFen(initialChess.fen())
      
      const moves = history.map(m => m.lan || (m.from + m.to + (m.promotion || '')))
      setMovesList(moves)

    } catch (e: any) {
      setError('Ошибка парсинга PGN. Убедитесь, что формат правильный. ' + e.message)
    }
  }

  const savePuzzle = async () => {
    if (!previewFen || movesList.length === 0) {
      setError('Сначала распарсите PGN')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/puzzles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fen: previewFen,
          moves: movesList.join(' '),
          rating: parseInt(rating),
          themes
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Ошибка при сохранении')
      }

      setSuccess('Задача успешно сохранена!')
      setPgn('')
      setPreviewFen('')
      setMovesList([])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-muted rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold">Добавление авторских задач (PGN)</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4 bg-card p-6 rounded-xl border border-border shadow-sm">
            <div>
              <label className="block text-sm font-medium mb-2">PGN текст задачи</label>
              <textarea 
                value={pgn}
                onChange={(e) => setPgn(e.target.value)}
                className="w-full h-48 bg-background border border-input rounded-lg p-3 text-sm font-mono"
                placeholder={'[Event "Custom Puzzle"]\n[FEN "r1bqk2r/pp2bppp/2n5/3p4/2pP4/4PN2/PPB2PPP/R1BQK2R w KQkq - 0 10"]\n\n1. Bxh7+ Kxh7 2. Ng5+ ...'}
              />
            </div>
            <button onClick={parsePgn} className="w-full button bg-secondary text-secondary-foreground hover:bg-secondary/80">
              <Upload className="w-4 h-4 mr-2" />
              Распарсить PGN
            </button>

            {error && <div className="text-red-500 text-sm font-medium p-3 bg-red-50 rounded-lg">{error}</div>}
            {success && <div className="text-green-500 text-sm font-medium p-3 bg-green-50 rounded-lg">{success}</div>}

            {previewFen && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div>
                  <label className="block text-sm font-medium mb-1">Рейтинг (сложность)</label>
                  <input type="number" value={rating} onChange={e => setRating(e.target.value)} className="w-full bg-background border border-input rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Темы (через пробел)</label>
                  <input type="text" value={themes} onChange={e => setThemes(e.target.value)} className="w-full bg-background border border-input rounded-lg p-2" placeholder="mate fork endgame" />
                </div>
                <button onClick={savePuzzle} disabled={loading} className="w-full button bg-primary text-primary-foreground hover:bg-primary/90">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Сохранить в базу
                </button>
              </div>
            )}
          </div>

          <div>
            {previewFen ? (
              <div className="bg-card p-6 rounded-xl border border-border shadow-sm space-y-4">
                <h3 className="font-semibold text-lg">Предпросмотр начальной позиции</h3>
              <ResponsiveBoard>
                  <Chessboard options={{ position: previewFen, boardOrientation: previewFen.split(' ')[1] === 'w' ? 'white' : 'black' }} />
                </ResponsiveBoard>
                <EngineToggle fen={previewFen || null} className="mt-2" />
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Распознанные ходы (решение):</h4>
                  <div className="flex flex-wrap gap-1">
                    {movesList.map((m, i) => (
                      <span key={i} className="px-2 py-1 bg-muted rounded text-xs font-mono">{m}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full bg-muted/20 border border-dashed border-border rounded-xl flex items-center justify-center text-muted-foreground p-8 text-center">
                Вставьте PGN и нажмите "Распарсить", чтобы увидеть предпросмотр задачи.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
