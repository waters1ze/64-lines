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

  // Update user
  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      rating: newRating,
      puzzlesSolvedToday: solvedToday + 1,
      lastPuzzleDate: now
    }
  })

  return NextResponse.json({ rating: updated.rating, ratingChange, puzzlesSolvedToday: updated.puzzlesSolvedToday })
}
