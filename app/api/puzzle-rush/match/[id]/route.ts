import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const match = await db.puzzleRushMatch.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, rating: true } }
          },
          orderBy: { score: 'desc' } // or we can handle sorting on client
        }
      }
    })

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const isParticipant = match.participants.some(p => p.userId === user.id)
    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(match)
  } catch (error) {
    console.error('Error fetching match:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
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
    if (match.status === 'FINISHED' || match.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Cannot cancel this match' }, { status: 400 })
    }

    await db.puzzleRushMatch.update({
      where: { id: match.id },
      data: { status: 'CANCELLED' }
    })

    // Send notifications to all participants
    const notifications = match.participants
      .filter(p => p.userId !== user.id)
      .map(p => ({
        userId: p.userId,
        title: 'Матч отменён',
        message: `${user.name || 'Организатор'} расформировал матч.`,
        link: `/?section=puzzles`,
        type: 'MATCH_UPDATE',
        relatedId: match.id,
      }))

    if (notifications.length > 0) {
      await db.notification.createMany({ data: notifications })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error cancelling match:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
