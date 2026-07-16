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

    return NextResponse.json(match)
  } catch (error) {
    console.error('Error fetching match:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
