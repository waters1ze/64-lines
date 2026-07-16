import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const match = await db.puzzleRushMatch.findUnique({
      where: { id },
      include: { participants: true }
    })

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

    const participant = match.participants.find(p => p.userId === user.id)
    if (!participant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (match.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Матч был отменен организатором' }, { status: 400 })
    }

    if (participant.status === 'REMOVED') {
      return NextResponse.json({ error: 'Вы были исключены из этого матча' }, { status: 403 })
    }

    if (participant.status === 'DECLINED') {
      return NextResponse.json({ error: 'You have declined this match' }, { status: 400 })
    }

    if (participant.finishedAt) {
      return NextResponse.json({ error: 'You have already finished this match' }, { status: 400 })
    }

    // Mark participant as ACCEPTED (if they were INVITED) and set startedAt
    await db.puzzleRushMatchParticipant.update({
      where: { id: participant.id },
      data: {
        status: 'ACCEPTED',
        startedAt: new Date()
      }
    })

    // If match is still WAITING, set it to ACTIVE
    if (match.status === 'WAITING') {
      await db.puzzleRushMatch.update({
        where: { id: match.id },
        data: { status: 'ACTIVE' }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error starting match:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
