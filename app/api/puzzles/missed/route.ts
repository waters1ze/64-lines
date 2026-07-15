import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const missed = await db.missedPuzzle.findFirst({
    where: { userId: user.id, resolved: false },
    orderBy: { missedAt: 'desc' }
  })

  if (!missed) {
    return NextResponse.json({ error: 'NO_MISSED_PUZZLES' }, { status: 200 })
  }

  const puzzle = await db.puzzle.findUnique({ where: { id: missed.puzzleId } })
  if (!puzzle) {
    return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 })
  }

  return NextResponse.json(puzzle)
}
