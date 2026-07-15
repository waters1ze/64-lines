import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { isCorrect } = await req.json()

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

  // Calculate rating change
  // Simple Elo for puzzles: +10 if correct, -10 if wrong
  let ratingChange = isCorrect ? 10 : -10
  const newRating = Math.max(100, (user.rating || 1200) + ratingChange)

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

  // Update user
  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      rating: newRating,
      puzzlesSolvedToday: solvedToday + 1,
      lastPuzzleDate: now,
      puzzlesSolvedTotal,
      puzzlesAttempted,
      activityStreak,
      lastActivityDate: now
    }
  })

  return NextResponse.json({ 
    rating: updated.rating, 
    ratingChange, 
    puzzlesSolvedToday: updated.puzzlesSolvedToday 
  })
}
