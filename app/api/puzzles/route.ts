import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

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
  let puzzle = null;

  // Try RapidAPI first
  try {
    const res = await fetch(`https://chess-puzzles.p.rapidapi.com/?rating=${targetRating}&count=1`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'chess-puzzles.p.rapidapi.com',
        'x-rapidapi-key': '11089b4e0bmsh26773ff32f030c1p17ad8djsn39bdeef95907'
      },
      signal: AbortSignal.timeout(3000) // 3s timeout
    })
    if (res.ok) {
      const data = await res.json()
      if (data && data.puzzles && data.puzzles.length > 0) {
        puzzle = {
          id: data.puzzles[0].puzzleid,
          fen: data.puzzles[0].fen,
          moves: data.puzzles[0].moves.join(' '), // Assuming moves is array, if not it will fail back to DB
          rating: data.puzzles[0].rating,
          themes: data.puzzles[0].themes.join(' ')
        }
      }
    }
  } catch (e) {
    console.error('RapidAPI failed, falling back to DB', e)
  }

  if (!puzzle) {
    // Fallback to our own DB
    let puzzles = await db.puzzle.findMany({
      where: {
        rating: {
          gte: targetRating - 200,
          lte: targetRating + 200,
        }
      }
    })

    if (puzzles.length === 0) {
      puzzles = await db.puzzle.findMany({ take: 10 })
    }

    if (puzzles.length > 0) {
      puzzle = puzzles[Math.floor(Math.random() * puzzles.length)]
    }
  }

  if (!puzzle) {
    return NextResponse.json({ error: 'No puzzles available' }, { status: 404 })
  }

  return NextResponse.json(puzzle)
}
