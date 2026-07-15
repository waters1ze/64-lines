import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { opponentId } = await req.json()
  
  if (!opponentId) {
    return NextResponse.json({ error: 'Opponent required' }, { status: 400 })
  }

  const duel = await db.puzzleRushDuel.create({
    data: {
      creatorId: user.id,
      opponentId,
      status: 'PENDING'
    }
  })

  return NextResponse.json(duel)
}
