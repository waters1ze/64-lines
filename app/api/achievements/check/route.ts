import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        achievements: { select: { achievement: { select: { code: true } } } },
        importedGames: { select: { id: true } },
        matchParticipations: { select: { id: true } },
      }
    })

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const unlockedCodes = new Set(user.achievements.map(a => a.achievement.code))
    const newlyUnlocked: any[] = []

    // Ensure achievements exist in DB
    const allAchievements = await db.achievement.findMany()
    const ensureAchievement = async (code: string, title: string, description: string, icon: string) => {
      let ach = allAchievements.find(a => a.code === code)
      if (!ach) {
        ach = await db.achievement.create({ data: { code, title, description, icon } })
        allAchievements.push(ach)
      }
      return ach
    }

    const checkAndAward = async (condition: boolean, code: string, title: string, desc: string, icon: string) => {
      if (condition && !unlockedCodes.has(code)) {
        const ach = await ensureAchievement(code, title, desc, icon)
        await db.userAchievement.create({
          data: { userId: user.id, achievementId: ach.id }
        })
        newlyUnlocked.push(ach)
        
        await db.activityEvent.create({
          data: {
            userId: user.id,
            type: 'ACHIEVEMENT_UNLOCKED',
            message: `Открыто достижение: ${ach.title} ${ach.icon}`
          }
        })
      }
    }

    // 1. Referral Achievement
    await checkAndAward(
      (user.referralRewardsCount || 0) >= 1,
      'FIRST_REFERRAL',
      'Душа компании',
      'Пригласить первого друга',
      '🤝'
    )

    // 2. Import Game Achievement
    await checkAndAward(
      user.importedGames.length >= 1,
      'FIRST_IMPORT',
      'Аналитик',
      'Импортировать партию для разбора',
      '🔍'
    )

    // 3. Tournaments / Matches
    await checkAndAward(
      user.matchParticipations.length >= 1,
      'FIRST_MATCH',
      'Гладиатор',
      'Сыграть первый турнир или дуэль',
      '⚔️'
    )

    // 4. Season Rating (e.g. reach 1600 in season)
    await checkAndAward(
      (user.seasonRating || 0) >= 1600,
      'SEASON_PRO',
      'Герой Сезона',
      'Достичь сезонного рейтинга 1600',
      '🌟'
    )

    // 5. Total Puzzles
    await checkAndAward(
      (user.puzzlesSolvedTotal || 0) >= 100,
      'PUZZLE_MASTER_100',
      'Мастер Задач',
      'Решить 100 задач',
      '🧩'
    )

    return NextResponse.json({ success: true, newlyUnlocked })

  } catch (error) {
    console.error('Achievements check error:', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
