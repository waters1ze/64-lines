import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const history = await db.puzzleRushMatch.findMany({
      where: {
        participants: {
          some: { userId: user.id }
        },
        status: { in: ['FINISHED'] } // only finished matches
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    })

    return NextResponse.json(history)
  } catch (error) {
    console.error('Error fetching match history:', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
