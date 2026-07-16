'use client'

import React, { useState, useEffect } from 'react'
import { Link as LinkIcon, Download, Plus, BookOpen } from 'lucide-react'
import { ImportGamesModal } from './ImportGamesModal'

export function ImportedGamesWidget({ studentId }: { studentId?: string }) {
  const [games, setGames] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchGames = () => {
    setLoading(true)
    const url = studentId ? `/api/games/import?studentId=${studentId}` : '/api/games/import'
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setGames(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchGames()
  }, [studentId])

  const handleDownload = (pgn: string, id: string) => {
    const blob = new Blob([pgn], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `imported_game_${id}.pgn`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary" />
            Импортированные партии
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Партии с внешних платформ для разбора</p>
        </div>
        {!studentId && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Добавить
          </button>
        )}
      </div>

      {loading ? (
        <div className="animate-pulse h-24 bg-muted rounded-xl"></div>
      ) : games.length === 0 ? (
        <div className="text-center py-6 border border-dashed rounded-xl bg-muted/20">
          <BookOpen className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Пока нет импортированных партий.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
          {games.map(game => (
            <div key={game.id} className="flex justify-between items-center p-3 rounded-xl border bg-muted/30">
              <div>
                <p className="text-sm font-semibold">
                  {game.platform === 'LICHESS' ? 'Партия с Lichess' : 'Партия с Chess.com'}
                </p>
                <a 
                  href={game.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-primary hover:underline block truncate max-w-[200px]"
                >
                  {game.url}
                </a>
              </div>
              <button 
                onClick={() => handleDownload(game.pgn, game.id)}
                className="p-2 bg-background border rounded-md hover:bg-muted transition text-muted-foreground hover:text-foreground"
                title="Скачать PGN"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ImportGamesModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchGames} 
      />
    </div>
  )
}
