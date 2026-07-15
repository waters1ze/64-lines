import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { score } = await req.json()
    if (typeof score !== 'number' || score < 0) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
    }

    const result = await db.puzzleRushResult.create({
      data: {
        userId: session.user.id,
        score
      }
    })

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Puzzle Rush finish error:', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
