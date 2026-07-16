import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { opponentUserIds } = await req.json()
    
    if (!opponentUserIds || !Array.isArray(opponentUserIds) || opponentUserIds.length === 0) {
      return NextResponse.json({ error: 'No opponents provided' }, { status: 400 })
    }

    // Create match and participants
    const match = await db.puzzleRushMatch.create({
      data: {
        creatorId: user.id,
        participants: {
          create: [
            { userId: user.id, status: 'ACCEPTED' }, // Creator is immediately accepted
            ...opponentUserIds.map((id: string) => ({ userId: id, status: 'INVITED' }))
          ]
        }
      }
    })

    // Create notifications for invited opponents
    const notifications = opponentUserIds.map((id: string) => ({
      userId: id,
      title: 'Вызов в Puzzle Rush',
      message: `${user.name || 'Пользователь'} вызывает вас на матч в Puzzle Rush!`,
      link: `/puzzle-rush/match/${match.id}`,
      type: 'MATCH_INVITE',
      relatedId: match.id,
    }))

    if (notifications.length > 0) {
      await db.notification.createMany({
        data: notifications
      })
    }

    return NextResponse.json({ matchId: match.id })
  } catch (error) {
    console.error('Error creating match:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
