'use client'

import { useEffect, useState } from 'react'
import { Crown, Timer, CheckCircle2 } from 'lucide-react'

type Participant = {
  id: string
  userId: string
  status: string
  score: number | null
  finishedAt: string | null
  user: {
    id: string
    name: string | null
    rating: number
  }
}

type Match = {
  id: string
  status: string
  createdAt: string
  participants: Participant[]
}

export function MatchLeaderboard({ matchId, currentUserId }: { matchId: string, currentUserId: string }) {
  const [match, setMatch] = useState<Match | null>(null)

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const res = await fetch(`/api/puzzle-rush/match/${matchId}`)
        if (res.ok) {
          const data = await res.json()
          setMatch(data)
        }
      } catch (err) {
        console.error('Error fetching match:', err)
      }
    }

    fetchMatch()
    
    // Poll every 3 seconds if not finished
    const interval = setInterval(() => {
      if (match?.status !== 'FINISHED') {
        fetchMatch()
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [matchId, match?.status])

  if (!match) return <div className="p-4 bg-card border rounded-xl shadow-sm">Загрузка...</div>

  // Sort participants by score (descending)
  const sortedParticipants = [...match.participants].sort((a, b) => (b.score || 0) - (a.score || 0))

  return (
    <div className="w-full h-full bg-card border rounded-xl shadow-sm overflow-hidden">
      <div className="bg-muted/30 border-b p-4">
        <h3 className="text-lg font-bold flex items-center justify-between">
          <span>Лидерборд</span>
          {match.status === 'FINISHED' ? (
            <span className="text-sm font-normal text-green-600 bg-green-100 px-2 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Завершен
            </span>
          ) : (
            <span className="text-sm font-normal text-blue-600 bg-blue-100 px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
              <Timer className="w-4 h-4" /> В игре
            </span>
          )}
        </h3>
      </div>
      <div className="p-0">
        <ul className="divide-y divide-border">
          {sortedParticipants.map((p, index) => {
            const isMe = p.userId === currentUserId
            const isWinner = match.status === 'FINISHED' && index === 0 && (p.score || 0) > 0
            
            return (
              <li 
                key={p.userId} 
                className={`flex items-center justify-between p-4 ${isMe ? 'bg-blue-50/50' : ''} ${isWinner ? 'bg-amber-50/50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 text-center font-bold text-sm ${index === 0 ? 'text-amber-500' : index === 1 ? 'text-slate-400' : index === 2 ? 'text-amber-700' : 'text-stone-400'}`}>
                    #{index + 1}
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-medium text-sm flex items-center gap-1 ${isMe ? 'text-blue-700' : 'text-stone-700'}`}>
                      {p.user.name || 'Аноним'}
                      {isMe && <span className="text-[10px] bg-blue-200 text-blue-800 px-1.5 rounded ml-1">Вы</span>}
                      {isWinner && <Crown className="w-3 h-3 text-amber-500 ml-1" />}
                    </span>
                    <span className="text-xs text-stone-500">{p.user.rating}</span>
                  </div>
                </div>
                
                <div className="text-right flex flex-col items-end">
                  {p.status === 'ACCEPTED' ? (
                    <>
                      <span className="font-bold text-lg leading-none">{p.score !== null ? p.score : '-'}</span>
                      {p.finishedAt ? (
                        <span className="text-[10px] text-stone-400">закончил</span>
                      ) : (
                        <span className="text-[10px] text-blue-500 animate-pulse">играет...</span>
                      )}
                    </>
                  ) : p.status === 'DECLINED' ? (
                    <span className="text-xs text-red-500">Отказ</span>
                  ) : match.status === 'FINISHED' ? (
                    <span className="text-xs text-stone-400">Пропустил</span>
                  ) : (
                    <span className="text-xs text-stone-400">Приглашен</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
