import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function PATCH(
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
    if (match.creatorId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { targetUserId } = await req.json()
    if (!targetUserId) return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 })

    const participant = match.participants.find(p => p.userId === targetUserId)
    if (!participant) return NextResponse.json({ error: 'Participant not found' }, { status: 404 })

    await db.puzzleRushMatchParticipant.update({
      where: { id: participant.id },
      data: { status: 'REMOVED' }
    })

    // Notify the kicked user
    await db.notification.create({
      data: {
        userId: targetUserId,
        title: 'Исключение из матча',
        message: `${user.name || 'Организатор'} исключил вас из матча.`,
        link: `/?section=puzzles`,
        type: 'MATCH_UPDATE',
        relatedId: match.id,
      }
    })

    // Since we kicked someone, we might need to check if the match should finish 
    // if the removed person was the last one we were waiting for.
    const activeParticipants = match.participants.filter(p => p.status === 'ACCEPTED' && p.userId !== targetUserId)
    if (match.status === 'ACTIVE') {
      const allFinished = activeParticipants.every(p => p.finishedAt !== null)
      if (allFinished && activeParticipants.length > 0) {
        await db.puzzleRushMatch.update({
          where: { id: match.id },
          data: { status: 'FINISHED', finishedAt: new Date() }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error kicking participant:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
