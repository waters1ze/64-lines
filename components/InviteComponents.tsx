'use client'

import React, { useState, useEffect } from 'react'
import { Bell, Check, Search, UserPlus, X, CheckCircle2, Crown } from 'lucide-react'

function Head({ over, title, text }: { over: string; title: string; text: string }) {
  return (
    <div className="mb-6">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{over}</p>
      <h1 className="text-2xl font-bold mb-1">{title}</h1>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

// ─── AvailableStudents (раздел "Найти учеников" для учителей) ──────────────────

export function AvailableStudents({ notify }: { notify: (s: string) => void }) {
  const [students, setStudents] = useState<any[]>([])
  const [pendingInvites, setPendingInvites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [inviting, setInviting] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/students?available=true').then(r => r.json()).catch(() => []),
      fetch('/api/invites').then(r => r.json()).catch(() => []),
    ]).then(([s, inv]) => {
      if (Array.isArray(s)) setStudents(s)
      if (Array.isArray(inv)) setPendingInvites(inv)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const invite = async (studentId: string) => {
    setInviting(studentId)
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: studentId })
      })
      const data = await res.json()
      if (res.ok) { notify('Приглашение отправлено!'); load() }
      else notify(data.error || 'Ошибка')
    } catch { notify('Ошибка сети') }
    setInviting(null)
  }

  const cancelInvite = async (inviteId: string) => {
    try {
      const res = await fetch('/api/invites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId })
      })
      if (res.ok) { notify('Приглашение отозвано'); load() }
      else notify('Ошибка')
    } catch { notify('Ошибка сети') }
  }

  const acceptRequest = async (inviteId: string) => {
    try {
      const res = await fetch('/api/invites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action: 'ACCEPT' })
      })
      const data = await res.json()
      if (res.ok) { notify('Ученик добавлен!'); load() }
      else notify(data.error || 'Ошибка')
    } catch { notify('Ошибка сети') }
  }

  const rejectRequest = async (inviteId: string) => {
    try {
      await fetch('/api/invites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action: 'REJECT' })
      })
      notify('Запрос отклонён'); load()
    } catch { notify('Ошибка сети') }
  }

  const incomingRequests = pendingInvites.filter((i: any) => i.direction === 'STUDENT_REQUESTED')
  const myInvites = pendingInvites.filter((i: any) => i.direction === 'TEACHER_INVITED')

  const filtered = students.filter(s =>
    !search || (s.name || '').toLowerCase().includes(search.toLowerCase()) || (s.email || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Head
        over="Поиск"
        title="Найти учеников"
        text="Здесь отображаются ученики, у которых ещё нет учителя. Вы можете отправить им приглашение."
      />

      {incomingRequests.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-4">
          <p className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            Запросы от учеников ({incomingRequests.length})
          </p>
          <div className="flex flex-col gap-2">
            {incomingRequests.map((inv: any) => (
              <div key={inv.id} className="flex items-center gap-3 bg-background rounded-lg px-4 py-3 border">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {(inv.student?.name || 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{inv.student?.name || '—'}</p>
                  <p className="text-xs text-muted-foreground">{inv.student?.email}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => acceptRequest(inv.id)} className="button text-xs py-1 px-3">
                    <Check className="size-3 mr-1" /> Принять
                  </button>
                  <button onClick={() => rejectRequest(inv.id)} className="icon-button text-destructive">
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {myInvites.length > 0 && (
        <div className="rounded-xl border bg-muted/20 p-4 mb-4">
          <p className="font-semibold text-sm mb-3 text-muted-foreground">Ожидают ответа ({myInvites.length})</p>
          <div className="flex flex-wrap gap-2">
            {myInvites.map((inv: any) => (
              <div key={inv.id} className="flex items-center gap-2 bg-background border rounded-lg px-3 py-2 text-sm">
                <span className="font-medium">{inv.student?.name || inv.student?.email || '—'}</span>
                <button onClick={() => cancelInvite(inv.id)} className="text-muted-foreground hover:text-destructive transition-colors" title="Отозвать">
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          className="input pl-9 w-full"
          placeholder="Поиск по имени или email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Загрузка...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 text-sm">
          {search ? 'Ничего не найдено' : 'Нет доступных учеников без учителя'}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          {filtered.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-5 py-4 border-b last:border-0 hover:bg-muted/20 transition-colors">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-sm">
                {(s.name || 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{s.name || '—'}</p>
                <p className="text-xs text-muted-foreground">{s.email}</p>
              </div>
              <div className="text-sm text-muted-foreground shrink-0 mr-2">{s.rating} очков</div>
              <button
                onClick={() => invite(s.id)}
                disabled={inviting === s.id}
                className="button text-xs py-1.5 px-3 shrink-0"
              >
                <UserPlus className="size-3 mr-1" />
                {inviting === s.id ? 'Отправка...' : 'Пригласить'}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ─── StudentTeacherPanel (кнопка для ученика "попроситься к учителю") ──────────

export function StudentTeacherPanel({ teacherId, notify }: { teacherId?: string | null; notify: (s: string) => void }) {
  const [teachers, setTeachers] = useState<any[]>([])
  const [pendingInvites, setPendingInvites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState<string | null>(null)

  const load = () => {
    Promise.all([
      fetch('/api/users/teachers').then(r => r.json()).catch(() => []),
      fetch('/api/invites').then(r => r.json()).catch(() => []),
    ]).then(([t, inv]) => {
      if (Array.isArray(t)) setTeachers(t)
      if (Array.isArray(inv)) setPendingInvites(inv)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const request = async (teacherTargetId: string) => {
    setRequesting(teacherTargetId)
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: teacherTargetId })
      })
      const data = await res.json()
      if (res.ok) { notify('Запрос отправлен!'); load() }
      else notify(data.error || 'Ошибка')
    } catch { notify('Ошибка сети') }
    setRequesting(null)
  }

  const cancelAction = async (inviteId: string) => {
    try {
      await fetch('/api/invites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId })
      })
      notify('Запрос отозван'); load()
    } catch { notify('Ошибка сети') }
  }

  const acceptInvite = async (inviteId: string) => {
    try {
      const res = await fetch('/api/invites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action: 'ACCEPT' })
      })
      const data = await res.json()
      if (res.ok) { notify('Учитель добавлен! Обновите страницу.'); load() }
      else notify(data.error || 'Ошибка')
    } catch { notify('Ошибка сети') }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Загрузка...</p>

  const myTeacherInvite = pendingInvites.find((i: any) => i.direction === 'TEACHER_INVITED')
  const myRequest = pendingInvites.find((i: any) => i.direction === 'STUDENT_REQUESTED')

  return (
    <div className="flex flex-col gap-4">
      {teacherId && (
        <div className="rounded-xl border bg-muted/20 p-4 flex items-center gap-3">
          <CheckCircle2 className="size-5 text-primary shrink-0" />
          <p className="text-sm">У вас уже есть учитель.</p>
        </div>
      )}

      {myTeacherInvite && !teacherId && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="font-semibold text-sm mb-2">
            <Bell className="inline size-4 mr-1 text-primary" />
            Учитель <b>{myTeacherInvite.teacher?.name}</b> хочет взять вас в ученики
          </p>
          <div className="flex gap-2">
            <button onClick={() => acceptInvite(myTeacherInvite.id)} className="button text-sm py-1.5 px-4">
              <Check className="size-4 mr-1" /> Принять
            </button>
            <button onClick={() => cancelAction(myTeacherInvite.id)} className="button text-sm py-1.5 px-4 bg-muted text-foreground hover:bg-muted/80">
              Отклонить
            </button>
          </div>
        </div>
      )}

      {myRequest && !teacherId && (
        <div className="rounded-xl border bg-muted/30 p-4 flex items-center gap-3">
          <p className="text-sm flex-1">Вы попросились к учителю <b>{myRequest.teacher?.name}</b>. Ожидайте ответа.</p>
          <button onClick={() => cancelAction(myRequest.id)} className="text-xs text-muted-foreground hover:text-destructive">
            Отозвать
          </button>
        </div>
      )}

      {!teacherId && !myRequest && (
        <>
          <Head over="Поиск учителя" title="Преподаватели" text="Выберите преподавателя и отправьте запрос на обучение." />
          <div className="rounded-xl border overflow-hidden">
            {teachers.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6 text-center">Нет доступных преподавателей</p>
            ) : teachers.map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-4 border-b last:border-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-sm">
                  {(t.name || 'T').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.email}</p>
                </div>
                <button
                  onClick={() => request(t.id)}
                  disabled={requesting === t.id}
                  className="button text-xs py-1.5 px-3 shrink-0"
                >
                  <UserPlus className="size-3 mr-1" />
                  {requesting === t.id ? 'Отправка...' : 'Попроситься'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function OverviewInvitesWidget({ role, notify, onUpdate }: { role: string; notify: (s: string) => void; onUpdate?: () => void }) {
  const [invites, setInvites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    fetch('/api/invites').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setInvites(data)
    }).finally(() => setLoading(false))
  }
  
  useEffect(() => { load() }, [])

  const incoming = invites.filter(i => i.status === 'PENDING' && (
    (role === 'TEACHER' || role === 'ADMIN') ? i.direction === 'STUDENT_REQUESTED' : i.direction === 'TEACHER_INVITED'
  ))

  const handleAction = async (id: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/invites?id=${id}&action=${action}`, { method: 'PUT' })
      if (res.ok) {
        notify(action === 'accept' ? 'РџСЂРёРіР»Р°С€РµРЅРёРµ РїСЂРёРЅСЏС‚Рѕ' : 'РџСЂРёРіР»Р°С€РµРЅРёРµ РѕС‚РєР»РѕРЅРµРЅРѕ')
        load()
        if (onUpdate) onUpdate()
      } else notify('РћС€РёР±РєР°')
    } catch { notify('РћС€РёР±РєР° СЃРµС‚Рё') }
  }

  if (loading || incoming.length === 0) return null

  return (
    <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 rounded-2xl p-4 mb-6 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="font-medium text-blue-900 dark:text-blue-100">
          РЈ РІР°СЃ РµСЃС‚СЊ РЅРѕРІС‹Рµ Р·Р°РїСЂРѕСЃС‹!
        </h3>
      </div>
      <div className="space-y-2">
        {incoming.map(inv => (
          <div key={inv.id} className="bg-white dark:bg-zinc-900 p-3 rounded-xl border shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src={((role === 'TEACHER' || role === 'ADMIN') ? inv.student.avatar : inv.teacher.avatar) || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"} className="w-10 h-10 rounded-full bg-zinc-100" />
              <div>
                <p className="font-medium text-sm">{((role === 'TEACHER' || role === 'ADMIN') ? inv.student.name : inv.teacher.name) || 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ'}</p>
                <p className="text-xs text-muted-foreground">
                  {((role === 'TEACHER' || role === 'ADMIN') ? 'РїСЂРѕСЃРёС‚СЃСЏ Рє РІР°Рј РІ СѓС‡РµРЅРёРєРё' : 'РїСЂРёРіР»Р°С€Р°РµС‚ РІР°СЃ СЃС‚Р°С‚СЊ СѓС‡РµРЅРёРєРѕРј')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleAction(inv.id, 'accept')} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => handleAction(inv.id, 'reject')} className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

