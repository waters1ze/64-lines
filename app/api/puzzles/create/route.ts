import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user || user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Only teachers can add puzzles' }, { status: 403 })
    }

    const body = await req.json()
    const { fen, moves, rating, themes } = body

    if (!fen || !moves || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate a random ID for custom puzzles
    const id = `custom_${Math.random().toString(36).substring(2, 9)}`

    const puzzle = await db.puzzle.create({
      data: {
        id,
        fen,
        moves,
        rating: parseInt(rating),
        ratingDeviation: 0,
        themes: themes || 'custom',
        openingTags: ''
      }
    })

    return NextResponse.json(puzzle)
  } catch (error) {
    console.error('Error creating puzzle:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
