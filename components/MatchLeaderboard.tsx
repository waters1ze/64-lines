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
  creatorId: string
  participants: Participant[]
}

export function MatchLeaderboard({ matchId, currentUserId }: { matchId: string, currentUserId: string }) {
  const [match, setMatch] = useState<any>(null)
  
  const reinvite = async (targetUserId: string) => {
    try {
      await fetch(`/api/puzzle-rush/match/${matchId}/reinvite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId })
      })
      fetchMatch()
    } catch(e) { console.error(e) }
  }

  const cancelMatch = async () => {
    if (!confirm('Вы уверены, что хотите отменить этот матч?')) return;
    try {
      await fetch(`/api/puzzle-rush/match/${matchId}`, { method: 'DELETE' })
      fetchMatch()
    } catch(e) { console.error(e) }
  }

  const kickParticipant = async (targetUserId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого участника?')) return;
    try {
      await fetch(`/api/puzzle-rush/match/${matchId}/kick`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId })
      })
      fetchMatch()
    } catch(e) { console.error(e) }
  }

  const fetchMatch = async () => {
    try {
      const res = await fetch(`/api/puzzle-rush/match/${matchId}`)
      if (res.ok) {
        const data = await res.json()
        setMatch(data)
      } else if (res.status === 403) {
        window.location.href = '/' // fallback if they are not part of the match
      }
    } catch (err) {
      console.error('Error fetching match:', err)
    }
  }

  useEffect(() => {
    fetchMatch()
    
    // Poll every 3 seconds if not finished or cancelled
    const interval = setInterval(() => {
      if (match?.status !== 'FINISHED' && match?.status !== 'CANCELLED') {
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
          <div className="flex items-center gap-2">
            <span>Лидерборд</span>
            {match.creatorId === currentUserId && match.status !== 'FINISHED' && match.status !== 'CANCELLED' && (
              <button 
                onClick={cancelMatch}
                className="text-xs font-normal text-red-600 bg-red-100 hover:bg-red-200 px-2 py-1 rounded"
              >
                Отменить матч
              </button>
            )}
          </div>
          {match.status === 'FINISHED' ? (
            <span className="text-sm font-normal text-green-600 bg-green-100 px-2 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Завершен
            </span>
          ) : match.status === 'CANCELLED' ? (
            <span className="text-sm font-normal text-red-600 bg-red-100 px-2 py-1 rounded-full flex items-center gap-1">
              Отменен
            </span>
          ) : (
            <span className="text-sm font-normal text-blue-600 bg-blue-100 px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
              <Timer className="w-4 h-4" /> В игре
            </span>
          )}
        </h3>
      </div>
      
      {match.status === 'CANCELLED' && (
        <div className="p-4 bg-red-50 text-red-700 text-sm text-center border-b border-red-100">
          Организатор отменил этот матч. <a href="/?section=puzzles" className="font-bold underline">Вернуться к задачам</a>
        </div>
      )}
      {(() => {
        const myParticipant = match.participants.find((p: any) => p.userId === currentUserId)
        if (myParticipant?.status === 'REMOVED') {
          return (
            <div className="p-4 bg-red-50 text-red-700 text-sm text-center border-b border-red-100">
              Организатор исключил вас из матча. <a href="/?section=puzzles" className="font-bold underline">Вернуться к задачам</a>
            </div>
          )
        }
        return null
      })()}
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
                  {(() => {
                    if (p.status === 'ACCEPTED') {
                      if (p.finishedAt) {
                        return (
                          <>
                            <span className="font-bold text-lg leading-none">{p.score !== null ? p.score : '-'}</span>
                            <span className="text-[10px] text-stone-400">закончил</span>
                          </>
                        )
                      } else if (p.startedAt) {
                        return (
                          <>
                            <span className="font-bold text-lg leading-none">-</span>
                            <span className="text-[10px] text-blue-500 animate-pulse">играет...</span>
                          </>
                        )
                      } else {
                        return <span className="text-xs text-amber-600 font-medium bg-amber-100 px-2 py-0.5 rounded">Готовится</span>
                      }
                    } else if (p.status === 'DECLINED') {
                      return <span className="text-xs text-red-500">Отклонил</span>
                    } else if (p.status === 'REMOVED') {
                      return <span className="text-xs text-red-500">Исключен</span>
                    } else if (match.status === 'FINISHED' || match.status === 'CANCELLED') {
                      return <span className="text-xs text-stone-400">Пропустил</span>
                    } else {
                      // INVITED
                      const isExpired = new Date().getTime() - new Date(match.createdAt).getTime() > 15 * 60 * 1000;
                      if (isExpired && match.creatorId === currentUserId) {
                        return <button onClick={() => reinvite(p.userId)} className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200">Вызвать</button>
                      } else if (isExpired) {
                         return <span className="text-xs text-stone-400">Истекло</span>
                      }
                      return <span className="text-xs text-stone-400">Приглашен</span>
                    }
                  })()}
                  {match.creatorId === currentUserId && !isMe && p.status !== 'REMOVED' && match.status !== 'FINISHED' && match.status !== 'CANCELLED' && (
                    <button 
                      onClick={() => kickParticipant(p.userId)} 
                      className="mt-1 text-[10px] text-red-400 hover:text-red-600"
                    >
                      Кикнуть
                    </button>
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
