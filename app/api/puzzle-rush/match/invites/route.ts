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

    const invites = await db.puzzleRushMatchParticipant.findMany({
      where: {
        userId: user.id,
        status: 'INVITED',
        match: {
          status: 'WAITING',
          createdAt: {
            gte: new Date(Date.now() - 1000 * 60 * 60 * 24) // only from last 24 hours
          }
        }
      },
      include: {
        match: {
          include: {
            creator: {
              select: { name: true, id: true }
            }
          }
        }
      },
      orderBy: { match: { createdAt: 'desc' } }
    })

    return NextResponse.json(invites)
  } catch (error) {
    console.error('Error fetching match invites:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
