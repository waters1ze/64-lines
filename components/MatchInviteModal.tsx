'use client'

import { useState, useEffect } from 'react'
import { Users, Loader2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Friend = {
  id: string
  name: string | null
  rating: number
}

export function MatchInviteModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      loadFriends()
    }
  }, [isOpen])

  const loadFriends = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/friends')
      if (res.ok) {
        const data = await res.json()
        setFriends(data.friends || data)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleInvite = async () => {
    if (selectedIds.length === 0) return
    setCreating(true)
    try {
      const res = await fetch('/api/puzzle-rush/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opponentUserIds: selectedIds })
      })
      if (res.ok) {
        const data = await res.json()
        router.push(`/puzzle-rush/match/${data.matchId}`)
        onClose()
      }
    } catch (e) {
      console.error(e)
    }
    setCreating(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-muted/30">
          <div>
            <h3 className="font-bold text-lg">Пригласить соперников</h3>
            <p className="text-xs text-muted-foreground">Выберите друзей для совместного штурма</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
              <Users className="w-8 h-8 opacity-50" />
              У вас пока нет друзей в списке.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {friends.map(friend => (
                <label
                  key={friend.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    selectedIds.includes(friend.id) ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                    checked={selectedIds.includes(friend.id)}
                    onChange={() => toggleSelect(friend.id)}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{friend.name || 'Аноним'}</span>
                    <span className="text-xs text-muted-foreground">Рейтинг: {friend.rating}</span>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <button 
              className="px-4 py-2 border rounded-xl hover:bg-muted font-medium text-sm transition-colors" 
              onClick={onClose} 
              disabled={creating}
            >
              Отмена
            </button>
            <button 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center"
              onClick={handleInvite} 
              disabled={selectedIds.length === 0 || creating}
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Создать матч
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
