export interface AchievementDef {
  code: string
  title: string
  description: string
  icon: string
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    code: 'solved_10',
    title: 'Решатель задач I',
    description: 'Решено 10 шахматных задач',
    icon: '🎯'
  },
  {
    code: 'solved_100',
    title: 'Решатель задач II',
    description: 'Решено 100 шахматных задач',
    icon: '🏆'
  },
  {
    code: 'rating_1600',
    title: 'Кандидат в мастера',
    description: 'Рейтинг задач достиг 1600 ELO',
    icon: '⚡'
  },
  {
    code: 'streak_7',
    title: 'Недельная преданность',
    description: 'Стрик активности достиг 7 дней',
    icon: '🔥'
  },
  {
    code: 'streak_30',
    title: 'Месячный марафон',
    description: 'Стрик активности достиг 30 дней',
    icon: '👑'
  }
]
