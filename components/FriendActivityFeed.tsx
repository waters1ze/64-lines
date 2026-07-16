'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Target, Trophy, Swords, Flame, Loader2 } from 'lucide-react'

interface ActivityEvent {
  id: string
  userId: string
  type: string
  message: string
  createdAt: string
  user: { id: string; name: string | null }
}

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'только что'
  if (mins < 60) return `${mins} мин. назад`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ч. назад`
  const days = Math.floor(hrs / 24)
  return `${days} д. назад`
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function EventIcon({ type }: { type: string }) {
  const cls = 'w-4 h-4 shrink-0'
  switch (type) {
    case 'PUZZLE_MILESTONE': return <Target className={`${cls} text-blue-500`} />
    case 'ACHIEVEMENT': return <Trophy className={`${cls} text-yellow-500`} />
    case 'MATCH_WIN': return <Swords className={`${cls} text-purple-500`} />
    case 'STREAK_MILESTONE': return <Flame className={`${cls} text-orange-500`} />
    default: return <Target className={`${cls} text-muted-foreground`} />
  }
}

export function FriendActivityFeed() {
  const router = useRouter()
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/friends/activity')
      .then(r => r.json())
      .then(d => { if (d.events) setEvents(d.events) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm p-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Загрузка активности...
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Ваши друзья пока ничего не делали. Подождите или добавьте больше друзей!
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {events.map(ev => (
        <div key={ev.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors">
          {/* Avatar */}
          <button
            className="flex w-8 h-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={() => router.push(`/profile/${ev.user.id}`)}
            title={ev.user.name ?? 'Игрок'}
          >
            {initials(ev.user.name)}
          </button>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <span className="flex items-center gap-1.5 flex-wrap">
              <button
                className="font-semibold text-sm hover:underline hover:text-primary transition-colors"
                onClick={() => router.push(`/profile/${ev.user.id}`)}
              >
                {ev.user.name || 'Игрок'}
              </button>
              <EventIcon type={ev.type} />
              <span className="text-sm text-foreground">{ev.message}</span>
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(ev.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
