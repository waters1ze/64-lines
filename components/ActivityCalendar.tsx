'use client'

import React, { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'

export function ActivityCalendar() {
  const [dates, setDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/activity-log')
      .then(res => res.json())
      .then(data => {
        if (data.dates) setDates(data.dates)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load activity logs:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-center h-[120px]">
        <div className="text-xs text-muted-foreground animate-pulse">Загрузка календаря активности...</div>
      </div>
    )
  }

  // Generate last 90 days
  const today = new Date()
  const days: { dateStr: string; isActive: boolean; dayOfWeek: number }[] = []
  
  for (let i = 89; i >= 0; i--) {
    const d = new Date()
    d.setDate(today.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    days.push({
      dateStr,
      isActive: dates.includes(dateStr),
      dayOfWeek: d.getDay()
    })
  }

  return (
    <div className="bg-card border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-foreground" />
          <span>Календарь активности (90 дней)</span>
        </h4>
        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          Активных дней: {dates.length}
        </span>
      </div>
      <div className="flex flex-col items-center justify-center py-1">
        <div className="grid grid-flow-col grid-rows-7 gap-[3px] select-none mx-auto">
          {days.map((day) => (
            <div
              key={day.dateStr}
              title={`${day.dateStr}${day.isActive ? ' (Активный день!)' : ' (Нет активности)'}`}
              className={`w-[10px] h-[10px] rounded-[2px] transition-colors duration-200 ${
                day.isActive
                  ? 'bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-300 dark:hover:bg-white'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-800'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center justify-end w-full gap-1 mt-2 text-[10px] text-muted-foreground">
          <span>Меньше</span>
          <div className="w-[10px] h-[10px] rounded-[2px] bg-zinc-100 dark:bg-zinc-800/50" />
          <div className="w-[10px] h-[10px] rounded-[2px] bg-zinc-800 dark:bg-zinc-300" />
          <span>Больше</span>
        </div>
      </div>
    </div>
  )
}
