import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const match = await db.puzzleRushMatch.findUnique({
      where: { id: params.id },
      include: { participants: true }
    })

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

    const isCreator = match.creatorId === user.id
    if (!isCreator) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { targetUserId } = await req.json()
    if (!targetUserId) return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 })

    const participant = match.participants.find(p => p.userId === targetUserId)
    if (!participant) return NextResponse.json({ error: 'Participant not found' }, { status: 404 })

    if (participant.status !== 'INVITED') {
      return NextResponse.json({ error: 'Can only reinvite INVITED participants' }, { status: 400 })
    }

    // Since they are still INVITED, let's just recreate a notification and update match createdAt 
    // to give it another minute, or we could just bump the createdAt on the match.
    // Let's just bump match.createdAt to now() so the timer resets.
    await db.puzzleRushMatch.update({
      where: { id: match.id },
      data: { createdAt: new Date() }
    })

    // Also send a new notification
    await db.notification.create({
      data: {
        userId: targetUserId,
        title: 'Повторный вызов в Puzzle Rush',
        message: `${user.name || 'Пользователь'} снова вызывает вас на матч!`,
        link: `/?section=puzzles&matchId=${match.id}`,
        type: 'MATCH_INVITE',
        relatedId: match.id,
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reinviting:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
