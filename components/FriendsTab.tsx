'use client'

import React, { useState, useEffect } from 'react'
import { UserPlus, UserCheck, X, Check, Swords, Activity } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FriendActivityFeed } from '@/components/FriendActivityFeed'

export function FriendsTab({ notify, userId }: { notify: (s: string) => void, userId: string }) {
  const router = useRouter()
  const [friends, setFriends] = useState<any[]>([])
  const [pendingIncoming, setPendingIncoming] = useState<any[]>([])
  const [pendingOutgoing, setPendingOutgoing] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchEmail, setSearchEmail] = useState('')
  const [tab, setTab] = useState<'friends' | 'activity'>('friends')

  const fetchFriends = () => {
    fetch('/api/friends')
      .then(r => r.json())
      .then(d => {
        if (!d.error) {
          setFriends(d.friends || [])
          setPendingIncoming(d.pendingIncoming || [])
          setPendingOutgoing(d.pendingOutgoing || [])
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchFriends()
  }, [])

  const sendRequest = async () => {
    if (!searchEmail.trim()) return
    try {
      const res = await fetch('/api/users/search?email=' + encodeURIComponent(searchEmail))
      const data = await res.json()
      if (data.error || !data.user) {
        notify('Пользователь не найден')
        return
      }
      
      const reqRes = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: data.user.id })
      })
      const reqData = await reqRes.json()
      if (reqData.error) {
        notify(reqData.error)
      } else {
        notify('Заявка отправлена')
        setSearchEmail('')
        fetchFriends()
      }
    } catch {
      notify('Ошибка')
    }
  }

  const acceptRequest = async (id: string) => {
    await fetch(`/api/friends/${id}/accept`, { method: 'POST' })
    fetchFriends()
  }

  const rejectRequest = async (id: string) => {
    await fetch(`/api/friends/${id}/reject`, { method: 'POST' })
    fetchFriends()
  }

  if (loading) return <p className="text-sm text-muted-foreground p-8">Загрузка...</p>

  return (
    <div className="flex flex-col gap-6 mt-6">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit">
        <button
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'friends' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setTab('friends')}
        >
          <UserCheck className="w-4 h-4 inline mr-1.5" />Друзья
        </button>
        <button
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'activity' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setTab('activity')}
        >
          <Activity className="w-4 h-4 inline mr-1.5" />Активность
        </button>
      </div>

      {tab === 'friends' && (
        <>
          {/* Add friend */}
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><UserPlus className="size-5" /> Добавить друга</h2>
            <div className="flex gap-2">
              <input className="input max-w-sm" placeholder="Email друга" value={searchEmail} onChange={e => setSearchEmail(e.target.value)} />
              <button className="button" onClick={sendRequest}>Отправить</button>
            </div>
          </section>

          {pendingIncoming.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-amber-600">Входящие заявки</h2>
              <div className="grid gap-3 lg:grid-cols-3">
                {pendingIncoming.map(req => (
                  <div key={req.id} className="border rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{req.sender.name || 'Аноним'}</p>
                      <p className="text-xs text-muted-foreground">Рейтинг: {req.sender.rating}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="icon-button bg-green-500/10 text-green-600 hover:bg-green-500/20" onClick={() => acceptRequest(req.id)}><Check className="size-4"/></button>
                      <button className="icon-button bg-red-500/10 text-red-600 hover:bg-red-500/20" onClick={() => rejectRequest(req.id)}><X className="size-4"/></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {pendingOutgoing.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Отправленные заявки</h2>
              <div className="flex flex-wrap gap-2">
                {pendingOutgoing.map(req => (
                  <span key={req.id} className="badge bg-muted">Ожидает ответа: {req.receiver.name || req.receiver.email}</span>
                ))}
              </div>
            </section>
          )}

          {/* Friends list */}
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><UserCheck className="size-5" /> Мои друзья</h2>
            {friends.length === 0 ? (
              <p className="text-sm text-muted-foreground">У вас пока нет друзей. Добавьте их по email!</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-3">
                {friends.map(friend => (
                  <div key={friend.id} className="border rounded-xl p-4 flex flex-col gap-3">
                    <div>
                      {/* Internal navigation instead of target="_blank" */}
                      <button
                        className="font-semibold hover:underline hover:text-primary transition-colors text-left block"
                        onClick={() => router.push(`/profile/${friend.id}`)}
                      >
                        {friend.name || 'Аноним'}
                      </button>
                      <p className="text-xs text-muted-foreground">Рейтинг: {friend.rating}</p>
                    </div>
                    <button className="outline-button py-1 text-xs justify-center w-full" onClick={async () => {
                      try {
                        const res = await fetch('/api/puzzle-rush/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opponentUserIds: [friend.id] }) })
                        if (res.ok) {
                          const data = await res.json()
                          if (data.matchId) router.push('/?section=puzzles&matchId=' + data.matchId)
                        }
                      } catch { notify('Ошибка создания матча') }
                    }}>
                      <Swords className="size-3 mr-1" /> Вызвать на матч
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {tab === 'activity' && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Активность друзей</h2>
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4">
              <FriendActivityFeed />
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

