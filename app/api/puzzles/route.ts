import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const difficulty = url.searchParams.get('difficulty') || 'normal'
  const themesQuery = url.searchParams.get('themes')
  
  const selectedThemes = themesQuery
    ? themesQuery.split(',').map(t => t.trim()).filter(Boolean).slice(0, 3)
    : []

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const mode = url.searchParams.get('mode')

  // Check limits (skip for Puzzle Rush)
  if (mode !== 'rush') {
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

  // Fetch solved puzzles for user to exclude them
  const solvedPuzzles = await db.solvedPuzzle.findMany({
    where: { userId: user.id },
    select: { puzzleId: true }
  })
  const solvedIds = solvedPuzzles.map(s => s.puzzleId)

  // Helper filter function for themes in JS (exact word match)
  const filterByThemes = (puzzleList: any[]) => {
    if (selectedThemes.length === 0) return puzzleList
    return puzzleList.filter(p =>
      selectedThemes.every(t => p.themes.split(' ').includes(t))
    )
  }

  // 1. Try target range
  let puzzles = await db.puzzle.findMany({
    where: {
      id: { notIn: solvedIds },
      rating: {
        gte: targetRating + minDiff,
        lte: targetRating + maxDiff,
      }
    }
  })
  let filtered = filterByThemes(puzzles)

  // 2. Fallback to wider range
  if (filtered.length === 0) {
    puzzles = await db.puzzle.findMany({
      where: {
        id: { notIn: solvedIds },
        rating: {
          gte: targetRating - 300,
          lte: targetRating + 300,
        }
      }
    })
    filtered = filterByThemes(puzzles)
  }

  // 3. Fallback to all unsolved puzzles sorted by closest rating
  if (filtered.length === 0) {
    const allUnsolved = await db.puzzle.findMany({
      where: {
        id: { notIn: solvedIds }
      }
    })
    filtered = filterByThemes(allUnsolved)
    if (filtered.length > 0) {
      filtered.sort((a, b) => Math.abs(a.rating - targetRating) - Math.abs(b.rating - targetRating))
    }
  }

  if (filtered.length > 0) {
    puzzle = filtered[Math.floor(Math.random() * filtered.length)]
  }

  if (!puzzle) {
    if (selectedThemes.length > 0) {
      // Differentiate: why did we find 0 puzzles?
      // Find if there are ANY puzzles with these themes in the DB (even solved ones)
      const potentialPuzzles = await db.puzzle.findMany({
        where: {
          AND: selectedThemes.map(t => ({
            themes: { contains: t }
          }))
        }
      })
      const hasAnyForThemes = potentialPuzzles.some(p =>
        selectedThemes.every(t => p.themes.split(' ').includes(t))
      )

      if (hasAnyForThemes) {
        return NextResponse.json({ error: 'ALL_SOLVED_FOR_THEMES' }, { status: 200 })
      } else {
        return NextResponse.json({ error: 'NO_PUZZLES_FOR_THEMES' }, { status: 200 })
      }
    }
    return NextResponse.json({ error: 'No puzzles available' }, { status: 404 })
  }

  return NextResponse.json(puzzle)
}

