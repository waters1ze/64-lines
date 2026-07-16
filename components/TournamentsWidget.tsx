'use client'

import React, { useState, useEffect } from 'react'
import { Trophy, ExternalLink, Plus, Calendar, Loader2, X } from 'lucide-react'

interface Tournament {
  id: string
  title: string
  description: string | null
  lichessUrl: string
  startsAt: string
  endsAt: string
  createdAt: string
}

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isActive(t: Tournament): boolean {
  const now = Date.now()
  return new Date(t.startsAt).getTime() <= now && new Date(t.endsAt).getTime() >= now
}

function isUpcoming(t: Tournament): boolean {
  return new Date(t.startsAt).getTime() > Date.now()
}

interface TournamentsWidgetProps {
  role: string
  notify: (s: string) => void
}

export function TournamentsWidget({ role, notify }: TournamentsWidgetProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [lichessUrl, setLichessUrl] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [creating, setCreating] = useState(false)

  const canCreate = role === 'ADMIN' || role === 'Учитель'

  const fetchTournaments = () => {
    fetch('/api/tournaments')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setTournaments(d)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTournaments() }, [])

  const handleCreate = async () => {
    if (!title || !lichessUrl || !startsAt || !endsAt) {
      notify('Заполните все обязательные поля')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, lichessUrl, startsAt, endsAt })
      })
      const data = await res.json()
      if (res.ok) {
        notify('Турнир создан! Уведомление отправлено участникам.')
        setShowCreate(false)
        setTitle(''); setDescription(''); setLichessUrl(''); setStartsAt(''); setEndsAt('')
        fetchTournaments()
      } else {
        notify(data.error || 'Ошибка создания турнира')
      }
    } catch { notify('Ошибка сети') }
    setCreating(false)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Загрузка турниров...
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-yellow-500/15 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <p className="font-semibold text-sm">Турниры</p>
            <p className="text-xs text-muted-foreground">{tournaments.length > 0 ? `${tournaments.length} активных` : 'Нет активных'}</p>
          </div>
        </div>
        {canCreate && (
          <button className="outline-button text-xs py-1.5 px-3 flex items-center gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5" /> Создать
          </button>
        )}
      </div>

      {/* Tournament list */}
      <div className="divide-y">
        {tournaments.length === 0 ? (
          <p className="text-sm text-muted-foreground p-5">Нет активных турниров. Следите за анонсами!</p>
        ) : (
          tournaments.map(t => (
            <div key={t.id} className="p-4 flex items-start justify-between gap-4 hover:bg-muted/20 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{t.title}</p>
                  {isActive(t) && (
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-500/15 text-emerald-600 px-2 py-0.5 rounded-full">Сейчас</span>
                  )}
                  {isUpcoming(t) && (
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-blue-500/15 text-blue-600 px-2 py-0.5 rounded-full">Скоро</span>
                  )}
                </div>
                {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>{formatDate(t.startsAt)} — {formatDate(t.endsAt)}</span>
                </div>
              </div>
              <a
                href={t.lichessUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="outline-button text-xs py-1.5 px-3 shrink-0 flex items-center gap-1.5 hover:border-primary/40"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Lichess
              </a>
            </div>
          ))
        )}
      </div>

      {/* Create tournament modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg">Создать турнир</h2>
              <button className="icon-button" onClick={() => setShowCreate(false)}><X className="size-4" /></button>
            </div>
            <div className="flex flex-col gap-3">
              <label className="field">Название <span className="text-red-500">*</span>
                <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Летний рапид 2025" />
              </label>
              <label className="field">Описание
                <textarea className="textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Краткое описание турнира..." rows={2} />
              </label>
              <label className="field">Ссылка на Lichess <span className="text-red-500">*</span>
                <input className="input" value={lichessUrl} onChange={e => setLichessUrl(e.target.value)} placeholder="https://lichess.org/tournament/..." />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="field">Начало <span className="text-red-500">*</span>
                  <input className="input" type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} />
                </label>
                <label className="field">Конец <span className="text-red-500">*</span>
                  <input className="input" type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button className="outline-button flex-1" onClick={() => setShowCreate(false)}>Отмена</button>
                <button className="button flex-1" onClick={handleCreate} disabled={creating}>
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Создать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
