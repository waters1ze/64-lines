import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

function getYesterdayUTC(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { solved } = await req.json()
    if (typeof solved !== 'boolean') return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    const today = getTodayUTC()
    const yesterday = getYesterdayUTC()

    // Forgiving mode: if streak is 0 and they failed, do not record a failure, allow retries
    if (!solved && user.dailyPuzzleStreak === 0) {
      return NextResponse.json({ streak: 0, solved: false, ignored: true })
    }

    // Upsert attempt (allow re-submit only if not yet solved today)
    const existing = await db.dailyPuzzleAttempt.findUnique({
      where: { userId_date: { userId: user.id, date: today } }
    })
    if (existing) {
      // Already attempted — return current state without updating streak
      return NextResponse.json({ streak: user.dailyPuzzleStreak, alreadyAttempted: true, solved: existing.solved })
    }

    await db.dailyPuzzleAttempt.create({
      data: { userId: user.id, date: today, solved }
    })

    // Compute new streak
    let newStreak = user.dailyPuzzleStreak
    if (solved) {
      if (user.lastDailyPuzzleDate === yesterday) {
        newStreak = user.dailyPuzzleStreak + 1
      } else if (user.lastDailyPuzzleDate === today) {
        // shouldn't happen (we checked existing above), but guard
        newStreak = user.dailyPuzzleStreak
      } else {
        newStreak = 1
      }
    } else {
      // Failed — break streak
      newStreak = 0
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        dailyPuzzleStreak: newStreak,
        lastDailyPuzzleDate: today
      }
    })

    // Create streak milestone ActivityEvent
    const milestones = [7, 30, 100]
    if (solved && milestones.includes(newStreak)) {
      await db.activityEvent.create({
        data: {
          userId: user.id,
          type: 'STREAK_MILESTONE',
          message: `Стрик ${newStreak} дней подряд в задаче дня! 🔥`
        }
      })
    }

    return NextResponse.json({ streak: newStreak, solved })
  } catch (error) {
    console.error('POST /api/daily-puzzle/submit error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
