import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { checkAndGrantAchievements } from '@/lib/achievements'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { isCorrect, puzzleRating, puzzleId, themes } = await req.json()

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Check limits
  const now = new Date()
  let solvedToday = user.puzzlesSolvedToday || 0
  if (user.lastPuzzleDate) {
    const lastDate = new Date(user.lastPuzzleDate)
    if (lastDate.toDateString() !== now.toDateString()) {
      solvedToday = 0
    }
  }

  if (!user.isPremium && solvedToday >= 10) {
    return NextResponse.json({ error: 'LIMIT_REACHED' }, { status: 403 })
  }

  // Calculate rating change using Elo formula
  const currentRating = user.rating || 1200
  const pRating = puzzleRating || currentRating
  const K = 32
  const E = 1 / (1 + Math.pow(10, (pRating - currentRating) / 400))
  const score = isCorrect ? 1 : 0
  let ratingChange = Math.round(K * (score - E))
  
  const newRating = Math.max(100, currentRating + ratingChange)

  // Calculate season rating change
  const currentSeasonRating = user.seasonRating || 1500
  const ESeason = 1 / (1 + Math.pow(10, (pRating - currentSeasonRating) / 400))
  let seasonRatingChange = Math.round(K * (score - ESeason))
  const newSeasonRating = Math.max(100, currentSeasonRating + seasonRatingChange)
  const seasonPuzzlesSolved = (user.seasonPuzzlesSolved || 0) + (isCorrect ? 1 : 0)

  // Calculate new stats
  const puzzlesSolvedTotal = (user.puzzlesSolvedTotal || 0) + (isCorrect ? 1 : 0)
  const puzzlesAttempted = (user.puzzlesAttempted || 0) + 1

  // Calculate streak
  let activityStreak = user.activityStreak || 0
  const lastActivity = user.lastActivityDate ? new Date(user.lastActivityDate) : null
  
  // To avoid timezone issues, format dates to YYYY-MM-DD
  const todayStr = now.toISOString().split('T')[0]
  const lastStr = lastActivity ? lastActivity.toISOString().split('T')[0] : null
  
  if (lastStr) {
    const today = new Date(todayStr)
    const last = new Date(lastStr)
    const diffDays = Math.round((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      activityStreak += 1
    } else if (diffDays > 1) {
      activityStreak = 1
    }
  } else {
    activityStreak = 1
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      rating: newRating,
      puzzlesSolvedToday: solvedToday + 1,
      lastPuzzleDate: now,
      puzzlesSolvedTotal,
      puzzlesAttempted,
      activityStreak,
      lastActivityDate: now,
      seasonRating: newSeasonRating,
      seasonPuzzlesSolved
    }
  })

  // Check for Referral Reward
  if (isCorrect && (!user.puzzlesSolvedTotal || user.puzzlesSolvedTotal === 0)) {
    if (user.referredById) {
      try {
        const referrer = await db.user.findUnique({ where: { id: user.referredById } })
        if (referrer) {
          const oneMonthFromNow = new Date()
          oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1)
          
          let newPremiumUntil = oneMonthFromNow
          if (referrer.isPremium && referrer.premiumUntil && referrer.premiumUntil > new Date()) {
            newPremiumUntil = new Date(referrer.premiumUntil)
            newPremiumUntil.setMonth(newPremiumUntil.getMonth() + 1)
          }

          // If they are not premium, or they are premium via referral/trial, we update source.
          // If they are PAID, we KEEP it PAID.
          const newPremiumSource = (referrer.isPremium && referrer.premiumSource === 'PAID') 
            ? 'PAID' 
            : 'REFERRAL'

          await db.user.update({
            where: { id: referrer.id },
            data: {
              isPremium: true,
              premiumUntil: newPremiumUntil,
              premiumSource: newPremiumSource,
              referralRewardsCount: { increment: 1 }
            }
          })
          
          // Add notification for referrer
          await db.activityEvent.create({
            data: {
              userId: referrer.id,
              type: 'REFERRAL_REWARD',
              message: `Ваш друг ${user.name || 'пользователь'} решил первую задачу! Вы получаете +1 месяц Premium 🌟`
            }
          })
        }
      } catch (e) {
        console.error('Error processing referral reward:', e)
      }
    }
  }

  // Save solved puzzle or missed puzzle
  if (puzzleId) {
    if (isCorrect) {
      try {
        await db.solvedPuzzle.upsert({
          where: {
            userId_puzzleId: {
              userId: user.id,
              puzzleId: puzzleId
            }
          },
          update: {},
          create: {
            userId: user.id,
            puzzleId: puzzleId
          }
        })
        const missed = await db.missedPuzzle.findUnique({
          where: { userId_puzzleId: { userId: user.id, puzzleId: puzzleId } }
        })
        if (missed) {
          await db.missedPuzzle.update({
            where: { id: missed.id },
            data: { resolved: true }
          })
        }
      } catch (e) {
        console.error('Error recording solved puzzle:', e)
      }
    } else {
      try {
        await db.missedPuzzle.upsert({
          where: { userId_puzzleId: { userId: user.id, puzzleId: puzzleId } },
          update: { resolved: false, missedAt: new Date(), themes: themes || '' },
          create: { userId: user.id, puzzleId: puzzleId, themes: themes || '' }
        })
      } catch (e) {
        console.error('Error recording missed puzzle:', e)
      }
    }
  }

  // 1. Record Activity Log
  try {
    const logDate = new Date(todayStr + 'T00:00:00.000Z')
    await db.activityLog.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: logDate
        }
      },
      update: {},
      create: {
        userId: user.id,
        date: logDate
      }
    })
  } catch (e) {
    console.error('Error recording activity log:', e)
  }

  // 2. Check and Grant Achievements
  await checkAndGrantAchievements(user.id)

  // 3. Puzzle milestone ActivityEvent
  if (isCorrect) {
    const milestones = [10, 25, 50, 100, 200, 500, 1000]
    if (milestones.includes(puzzlesSolvedTotal)) {
      try {
        await db.activityEvent.create({
          data: {
            userId: user.id,
            type: 'PUZZLE_MILESTONE',
            message: `Решено ${puzzlesSolvedTotal} задач! 🎯`
          }
        })
      } catch (e) {
        console.error('ActivityEvent error:', e)
      }
    }
  }

  return NextResponse.json({ 
    rating: updated.rating, 
    ratingChange, 
    puzzlesSolvedToday: updated.puzzlesSolvedToday 
  })
}
