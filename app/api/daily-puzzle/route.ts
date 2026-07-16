import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
}

/** Deterministic hash of a date string → integer */
function hashDate(dateStr: string): number {
  let h = 0
  for (let i = 0; i < dateStr.length; i++) {
    h = (Math.imul(31, h) + dateStr.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const today = getTodayUTC()

    // Lazy creation: if no daily puzzle for today, pick one deterministically
    let dailyPuzzle = await db.dailyPuzzle.findUnique({ where: { date: today }, include: { puzzle: true } })

    if (!dailyPuzzle) {
      const count = await db.puzzle.count()
      if (count === 0) return NextResponse.json({ error: 'No puzzles available' }, { status: 503 })

      // Use hash mod count as a deterministic offset, prefer rating 1200–1800
      const offset = hashDate(today) % count
      const puzzle = await db.puzzle.findFirst({
        skip: offset,
        where: { rating: { gte: 1100, lte: 1900 } },
        orderBy: { id: 'asc' }
      }) ?? await db.puzzle.findFirst({ skip: offset % Math.max(1, count), orderBy: { id: 'asc' } })

      if (!puzzle) return NextResponse.json({ error: 'No puzzle found' }, { status: 503 })

      dailyPuzzle = await db.dailyPuzzle.upsert({
        where: { date: today },
        create: { date: today, puzzleId: puzzle.id },
        update: {},
        include: { puzzle: true }
      })
    }

    // Check if current user already attempted today
    const attempt = await db.dailyPuzzleAttempt.findUnique({
      where: { userId_date: { userId: user.id, date: today } }
    })

    return NextResponse.json({
      puzzle: dailyPuzzle.puzzle,
      date: today,
      solved: attempt?.solved ?? null,   // null = not attempted, true = solved, false = failed
      streak: user.dailyPuzzleStreak,
    })
  } catch (error) {
    console.error('GET /api/daily-puzzle error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
