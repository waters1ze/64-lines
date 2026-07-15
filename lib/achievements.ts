import { db } from './db'
import { sendPushToUser } from './push'

import { ACHIEVEMENTS } from './achievements-list'

export async function checkAndGrantAchievements(userId: string) {
  try {
    for (const def of ACHIEVEMENTS) {
      await db.achievement.upsert({
        where: { code: def.code },
        update: {
          title: def.title,
          description: def.description,
          icon: def.icon
        },
        create: {
          code: def.code,
          title: def.title,
          description: def.description,
          icon: def.icon
        }
      })
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        rating: true,
        activityStreak: true,
        puzzlesSolvedTotal: true,
        achievements: { select: { achievement: { select: { code: true } } } }
      }
    })

    if (!user) return

    const unlockedCodes = new Set(user.achievements.map((ua) => ua.achievement.code))

    for (const def of ACHIEVEMENTS) {
      if (unlockedCodes.has(def.code)) continue

      let shouldUnlock = false
      if (def.code === 'solved_10' && user.puzzlesSolvedTotal >= 10) shouldUnlock = true
      if (def.code === 'solved_100' && user.puzzlesSolvedTotal >= 100) shouldUnlock = true
      if (def.code === 'rating_1600' && user.rating >= 1600) shouldUnlock = true
      if (def.code === 'streak_7' && user.activityStreak >= 7) shouldUnlock = true
      if (def.code === 'streak_30' && user.activityStreak >= 30) shouldUnlock = true

      if (shouldUnlock) {
        const achievement = await db.achievement.findUnique({ where: { code: def.code } })
        if (!achievement) continue

        await db.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id
          }
        })

        await db.notification.create({
          data: {
            userId,
            title: 'Новое достижение!',
            message: `Вы разблокировали достижение: "${def.title}" — ${def.description}`,
            link: '?section=achievements'
          }
        })

        await sendPushToUser(userId, {
          title: 'Новое достижение! 🎉',
          body: `Вы получили бейдж "${def.title}"`,
          url: '/?section=achievements'
        }).catch((err) => console.error('Achievement push error:', err))
      }
    }
  } catch (error) {
    console.error('checkAndGrantAchievements error:', error)
  }
}
