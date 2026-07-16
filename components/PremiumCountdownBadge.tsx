'use client'

import React, { useState, useEffect } from 'react'
import { Crown } from 'lucide-react'

type Props = {
  premiumUntil: Date | string | null
  premiumSource: string | null
  onExpire?: () => void
}

export function PremiumCountdownBadge({ premiumUntil, premiumSource, onExpire }: Props) {
  const [timeLeft, setTimeLeft] = useState('')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!premiumUntil) {
      setIsVisible(false)
      return
    }

    const expireDate = new Date(premiumUntil)

    const updateTimer = () => {
      const now = new Date()
      const diffMs = expireDate.getTime() - now.getTime()

      if (diffMs <= 0) {
        setIsVisible(false)
        onExpire?.()
        return
      }

      setIsVisible(true)
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

      if (diffDays >= 1) {
        setTimeLeft(`Premium: ${diffDays} дн.`)
      } else if (diffHours >= 1) {
        setTimeLeft(`Premium: ${diffHours}ч ${diffMins}м`)
      } else {
        setTimeLeft(`Premium: ${diffMins} мин`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 60000) // update every minute

    return () => clearInterval(interval)
  }, [premiumUntil, onExpire])

  if (!isVisible) return null

  let sourceText = 'Платный'
  if (premiumSource === 'REFERRAL') sourceText = 'Приглашение друга'
  else if (premiumSource === 'TRIAL') sourceText = 'Пробный период'

  const exactDateStr = premiumUntil ? new Date(premiumUntil).toLocaleString('ru-RU') : ''

  return (
    <div 
      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-600 rounded-full text-xs font-semibold select-none cursor-default group relative"
      title={`Истекает: ${exactDateStr}\nИсточник: ${sourceText}`}
    >
      <Crown className="w-3.5 h-3.5" />
      <span>{timeLeft}</span>
    </div>
  )
}
