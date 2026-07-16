'use client'

import React, { useState, useEffect } from 'react'
import { Link, Copy, CheckCircle, Users } from 'lucide-react'

type ReferralData = {
  referralCode: string | null
  referralRewardsCount: number
  referrals: {
    id: string
    name: string | null
    createdAt: string
    puzzlesSolvedTotal: number
  }[]
}

export function ReferralWidget() {
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/referral/me')
      .then(res => res.json())
      .then(d => {
        if (!d.error) setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="animate-pulse h-32 bg-muted rounded-xl"></div>
  if (!data?.referralCode) return null

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const refLink = `${origin}/register?ref=${data.referralCode}`

  const handleCopy = () => {
    navigator.clipboard.writeText(refLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-card text-card-foreground border rounded-xl p-4 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Users className="w-32 h-32" />
      </div>

      <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
        Пригласи друга - получи Premium!
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Отправь эту ссылку другу. Как только он зарегистрируется и решит свою первую задачу, вы получите +1 день Premium бесплатно!
      </p>

      <div className="flex items-center gap-2 mb-4">
        <input 
          type="text" 
          value={refLink} 
          readOnly 
          className="flex-1 bg-muted/50 border rounded-md px-3 py-2 text-sm focus:outline-none"
        />
        <button 
          onClick={handleCopy}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 flex items-center gap-2 transition-colors"
        >
          {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Скопировано' : 'Копировать'}
        </button>
      </div>

      <div className="border-t pt-4 mt-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-semibold">Ваши приглашения</p>
          <p className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            Наград: {data.referralRewardsCount}
          </p>
        </div>
        
        {data.referrals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Вы еще никого не пригласили.</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
            {data.referrals.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-muted/30 p-2 rounded-md border text-sm">
                <span>{r.name || 'Аноним'}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-secondary">
                  {r.puzzlesSolvedTotal > 0 ? '✅ Активен' : '⏳ Ждет 1 задачу'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
