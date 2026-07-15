import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const duel = await db.puzzleRushDuel.findUnique({
    where: { id: id },
    include: { creator: true, opponent: true }
  })

  if (!duel) return NextResponse.json({ error: 'Duel not found' }, { status: 404 })

  return NextResponse.json(duel)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const duel = await db.puzzleRushDuel.findUnique({ where: { id: params.id } })
  if (!duel) return NextResponse.json({ error: 'Duel not found' }, { status: 404 })

  const { score } = await req.json()

  let updateData: any = {}
  
  if (duel.creatorId === user.id) {
    updateData.creatorScore = score
  } else if (duel.opponentId === user.id) {
    updateData.opponentScore = score
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // If both have scores (meaning both have played), we can mark it as COMPLETED
  // Wait, if one just played, they set their score. But the other might not have played yet.
  // Let's just update the score for now. The status can be checked on the frontend.
  // However, we can set status to 'COMPLETED' if both scores are not null.

  const updatedDuel = await db.puzzleRushDuel.update({
    where: { id: params.id },
    data: updateData
  })

  if (updatedDuel.creatorScore !== null && updatedDuel.opponentScore !== null) {
    await db.puzzleRushDuel.update({
      where: { id: params.id },
      data: { status: 'COMPLETED' }
    })
  }

  return NextResponse.json(updatedDuel)
}
