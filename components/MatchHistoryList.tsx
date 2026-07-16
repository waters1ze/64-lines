'use client'

import React, { useState, useEffect } from 'react'

export function MatchHistoryList({ currentUserId }: { currentUserId: string }) {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/puzzle-rush/match/history')
      .then(r => r.json())
      .then(d => {
        if (!d.error) setHistory(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="animate-pulse h-32 bg-muted rounded-xl"></div>
  if (history.length === 0) return <div className="text-muted-foreground text-sm">Нет завершенных матчей</div>

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg">История матчей</h3>
      <div className="space-y-2">
        {history.map(match => {
          const p1 = match.participants[0]
          const p2 = match.participants[1]
          
          if (!p1 || !p2) return null
          
          const isP1 = p1.userId === currentUserId
          const myScore = isP1 ? p1.score : p2.score
          const oppScore = isP1 ? p2.score : p1.score
          const oppName = isP1 ? p2.user?.name : p1.user?.name
          
          let result = 'Ничья'
          let color = 'text-muted-foreground'
          if ((myScore || 0) > (oppScore || 0)) {
            result = 'Победа'
            color = 'text-green-500'
          } else if ((myScore || 0) < (oppScore || 0)) {
            result = 'Поражение'
            color = 'text-red-500'
          }

          return (
            <div key={match.id} className="flex justify-between items-center p-3 rounded-xl border bg-card">
              <div>
                <p className="text-sm font-semibold">Матч против {oppName}</p>
                <p className="text-xs text-muted-foreground">{new Date(match.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${color}`}>{result}</p>
                <p className="text-xs font-mono">{myScore} - {oppScore}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
