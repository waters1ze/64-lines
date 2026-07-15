import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function GET() {
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

  // Get from our own DB
  let puzzles = await db.puzzle.findMany({
    where: {
      rating: {
        gte: targetRating - 100,
        lte: targetRating + 100,
      }
    }
  })

  if (puzzles.length === 0) {
    puzzles = await db.puzzle.findMany({
      where: {
        rating: {
          gte: targetRating - 200,
          lte: targetRating + 200,
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
