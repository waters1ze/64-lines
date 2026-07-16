'use client'

import React, { useState } from 'react'
import { X, Link as LinkIcon, Loader2 } from 'lucide-react'

type Props = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ImportGamesModal({ isOpen, onClose, onSuccess }: Props) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleImport = async () => {
    if (!url) return
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/games/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import game')
      }
      
      setUrl('')
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary" />
            Импорт партии
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Вставьте ссылку на партию с Lichess (например, https://lichess.org/...) чтобы импортировать её для разбора.
          </p>

          <div>
            <input 
              type="text" 
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://lichess.org/..."
              className="w-full bg-muted/50 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          
          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md hover:bg-muted transition"
              disabled={loading}
            >
              Отмена
            </button>
            <button 
              onClick={handleImport}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition flex items-center gap-2"
              disabled={loading || !url}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Импортировать
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
