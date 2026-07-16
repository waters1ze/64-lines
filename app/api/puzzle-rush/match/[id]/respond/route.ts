import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { action } = await req.json()
    if (action !== 'accept' && action !== 'decline') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const match = await db.puzzleRushMatch.findUnique({ where: { id: matchId } })
    if (!match) return NextResponse.json({ error: 'Матч не найден' }, { status: 404 })

    const participant = await db.puzzleRushMatchParticipant.findUnique({
      where: { matchId_userId: { matchId, userId: user.id } }
    })

    if (!participant) return NextResponse.json({ error: 'Вы не приглашены' }, { status: 403 })

    if (action === 'accept') {
      const isExpired = Date.now() - new Date(match.createdAt).getTime() > 60 * 1000
      if (isExpired) {
        return NextResponse.json({ error: 'Время приглашения (1 минута) истекло' }, { status: 400 })
      }
    }

    const newStatus = action === 'accept' ? 'ACCEPTED' : 'DECLINED'

    await db.puzzleRushMatchParticipant.update({
      where: { id: participant.id },
      data: { status: newStatus }
    })

    // Update match status to ACTIVE if it's currently WAITING and someone accepted
    if (action === 'accept') {
      const match = await db.puzzleRushMatch.findUnique({ where: { id: matchId } })
      if (match?.status === 'WAITING') {
        await db.puzzleRushMatch.update({
          where: { id: matchId },
          data: { status: 'ACTIVE', startedAt: new Date() }
        })
      }
    }

    // Mark related notification as read
    await db.notification.updateMany({
      where: { userId: user.id, relatedId: matchId, type: 'MATCH_INVITE' },
      data: { isRead: true }
    })

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error) {
    console.error('Error responding to match:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
