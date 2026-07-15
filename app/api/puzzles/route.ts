import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const difficulty = url.searchParams.get('difficulty') || 'normal'

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  if (!user.isPremium && solvedToday >= 5) {
    return NextResponse.json({ error: 'LIMIT_REACHED' }, { status: 403 })
  }

  const targetRating = user.rating || 1200
  let puzzle = null

  let minDiff = -100
  let maxDiff = 100

  if (difficulty === 'easy') {
    minDiff = -400
    maxDiff = -150
  } else if (difficulty === 'hard') {
    minDiff = 300
    maxDiff = 500
  }

  // Get from our own DB
  let puzzles = await db.puzzle.findMany({
    where: {
      rating: {
        gte: targetRating + minDiff,
        lte: targetRating + maxDiff,
      }
    }
  })

  if (puzzles.length === 0) {
    puzzles = await db.puzzle.findMany({
      where: {
        rating: {
          gte: targetRating - 300,
          lte: targetRating + 300,
        }
      }
    })
  }

  if (puzzles.length === 0) {
    // Get closest above or below
    const allPuzzles = await db.puzzle.findMany()
    if (allPuzzles.length > 0) {
      // Sort by absolute rating difference
      allPuzzles.sort((a, b) => Math.abs(a.rating - targetRating) - Math.abs(b.rating - targetRating))
      puzzles = [allPuzzles[0]]
    }
  }

  if (puzzles.length > 0) {
    puzzle = puzzles[Math.floor(Math.random() * puzzles.length)]
  }

  if (!puzzle) {
    return NextResponse.json({ error: 'No puzzles available' }, { status: 404 })
  }

  return NextResponse.json(puzzle)
}
