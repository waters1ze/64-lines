import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Find all accepted friends (in both directions)
    const accepted = await db.friendRequest.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ senderId: user.id }, { receiverId: user.id }]
      }
    })

    const friendIds = accepted.map(r => r.senderId === user.id ? r.receiverId : r.senderId)

    if (friendIds.length === 0) {
      return NextResponse.json({ events: [] })
    }

    const events = await db.activityEvent.findMany({
      where: { userId: { in: friendIds } },
      include: {
        user: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 30
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('GET /api/friends/activity error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
