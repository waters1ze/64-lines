import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        rating: true,
        activityStreak: true,
        puzzlesSolvedTotal: true,
        achievements: {
          include: {
            achievement: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      stats: {
        rating: user.rating,
        activityStreak: user.activityStreak,
        puzzlesSolvedTotal: user.puzzlesSolvedTotal
      },
      unlocked: user.achievements.map((ua) => ua.achievement.code)
    })
  } catch (error) {
    console.error('Achievements GET error:', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
