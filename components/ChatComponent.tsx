'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Send, User as UserIcon, Loader2 } from 'lucide-react'

type ChatUser = { id: string; name: string; role: string; lastMessage?: string; lastMessageTime?: string }

export default function ChatComponent({ userId, isTeacher, onStartCall }: { userId: string, isTeacher: boolean, onStartCall?: (studentId: string) => void }) {
  const [contacts, setContacts] = useState<ChatUser[]>([])
  const [activeContactId, setActiveContactId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([])
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchChatData()
    
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchChatData()
      }
    }, 4000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchChatData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [activeContactId])

  const fetchChatData = async () => {
    try {
      const res = await fetch(`/api/chat${activeContactId ? `?with=${activeContactId}` : ''}`)
      if (res.ok) {
        const data = await res.json()
        setContacts(data.contacts)
        if (activeContactId) {
          setMessages(data.messages)
        }
      }
      
      if (!isTeacher && availableTeachers.length === 0) {
        const tRes = await fetch('/api/users/teachers')
        if (tRes.ok) setAvailableTeachers(await tRes.json())
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const deleteChat = async () => {
    if (!activeContactId) return
    if (confirm('Вы уверены, что хотите удалить всю переписку с этим пользователем?')) {
      try {
        await fetch(`/api/chat?with=${activeContactId}`, { method: 'DELETE' })
        setMessages([])
        fetchChatData()
      } catch (e) {
        console.error('Failed to delete chat:', e)
      }
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeContactId) return
    const text = newMessage.trim()
    setNewMessage('')
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: activeContactId, content: text })
      })
      fetchChatData()
    } catch {}
  }

  // Combine active contacts and available teachers for students
  const displayContacts = [...contacts]
  if (!isTeacher) {
    availableTeachers.forEach(t => {
      if (!displayContacts.some(c => c.id === t.id)) displayContacts.push(t)
    })
  }

  const activeContact = displayContacts.find(c => c.id === activeContactId)

  if (loading && contacts.length === 0) {
    return <div className="p-8 text-center"><Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" /></div>
  }

  return (
    <div className="flex h-[calc(100vh-100px)] border rounded-xl overflow-hidden bg-background mt-4">
      {/* Sidebar */}
      <div className="w-1/3 min-w-[250px] border-r bg-muted/10 flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">Чаты</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {displayContacts.length === 0 && <p className="p-4 text-sm text-muted-foreground">Нет диалогов</p>}
          {displayContacts.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveContactId(c.id)}
              className={`w-full p-4 flex items-center gap-3 text-left border-b hover:bg-muted/50 transition-colors ${activeContactId === c.id ? 'bg-muted' : ''}`}
            >
              <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <UserIcon className="size-5" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold truncate">{c.name}</p>
                {c.lastMessage && <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage}</p>}
                {!c.lastMessage && (c as any).isMyTeacher && <p className="text-xs text-blue-500 font-medium mt-0.5">Преподаватель</p>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-muted/5 relative">
        {activeContactId ? (
          <>
            <div className="p-4 border-b bg-background flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <UserIcon className="size-5" />
                </div>
                <h3 className="font-semibold">{activeContact?.name}</h3>
              </div>
              <div className="flex gap-2 items-center">
                <button 
                  className="button bg-destructive/10 text-destructive hover:bg-destructive/20" 
                  onClick={deleteChat}
                >
                  Удалить чат
                </button>
                {isTeacher && activeContact?.role !== 'TEACHER' && onStartCall && (
                  <button className="button" onClick={() => onStartCall(activeContact.id)}>Начать урок</button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {messages.length === 0 && (
                <div className="m-auto text-center text-muted-foreground">
                  <p>Сообщений пока нет.</p>
                  <p className="text-sm">История за 30+ дней доступна только с Premium.</p>
                </div>
              )}
              {messages.map(m => {
                const isMe = m.senderId === userId
                return (
                  <div key={m.id} className={`flex max-w-[80%] ${isMe ? 'self-end' : 'self-start'}`}>
                    <div className={`p-3 rounded-2xl ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                      <p className="text-[10px] opacity-70 mt-1 text-right">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={endOfMessagesRef} />
            </div>
            <form onSubmit={sendMessage} className="p-4 bg-background border-t flex gap-2">
              <input
                className="input flex-1"
                placeholder="Напишите сообщение..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
              />
              <button type="submit" disabled={!newMessage.trim()} className="icon-button bg-primary text-primary-foreground hover:bg-primary/90 rounded-full size-10 shrink-0">
                <Send className="size-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Выберите диалог слева, чтобы начать общение
          </div>
        )}
      </div>
    </div>
  )
}
