'use client'

import React, { useEffect, useState } from 'react'
import { Award, CheckCircle2, Lock, Loader2 } from 'lucide-react'
import { ACHIEVEMENTS } from '@/lib/achievements-list'

export function AchievementsTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/achievements')
      .then(res => res.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load achievements:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    )
  }

  const stats = data?.stats || { rating: 1200, activityStreak: 0, puzzlesSolvedTotal: 0 }
  const unlocked = new Set<string>(data?.unlocked || [])

  const getProgress = (code: string) => {
    let current = 0
    let target = 1
    
    if (code === 'solved_10') {
      current = stats.puzzlesSolvedTotal
      target = 10
    } else if (code === 'solved_100') {
      current = stats.puzzlesSolvedTotal
      target = 100
    } else if (code === 'rating_1600') {
      current = stats.rating
      target = 1600
    } else if (code === 'streak_7') {
      current = stats.activityStreak
      target = 7
    } else if (code === 'streak_30') {
      current = stats.activityStreak
      target = 30
    }

    const percent = Math.min(Math.round((current / target) * 100), 100)
    return { current, target, percent }
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Award className="w-6 h-6 text-primary" />
          <span>Мои Достижения</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Решайте задачи, держите серию активности и повышайте свой рейтинг для разблокировки наград.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ACHIEVEMENTS.map((ach) => {
          const isUnlocked = unlocked.has(ach.code)
          const { current, target, percent } = getProgress(ach.code)

          return (
            <div
              key={ach.code}
              className={`bg-card border rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 ${
                isUnlocked
                  ? 'border-emerald-500/30 bg-emerald-500/5 shadow-xs'
                  : 'opacity-75'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-sm border ${
                  isUnlocked
                    ? 'bg-emerald-500/20 border-emerald-500/30'
                    : 'bg-muted border-border/80 text-muted-foreground'
                }`}
              >
                {ach.icon}
              </div>

              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-sm text-foreground truncate">
                    {ach.title}
                  </h4>
                  {isUnlocked ? (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Разблокировано
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                      <Lock className="w-3 h-3" />
                      В процессе
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {ach.description}
                </p>

                <div className="space-y-1">
                  <div className="w-full bg-muted/80 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isUnlocked ? 'bg-emerald-500' : 'bg-primary/70'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Прогресс: {percent}%</span>
                    <span>
                      {current} / {target}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
