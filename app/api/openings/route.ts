import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { db } from '@/lib/db'
import { broadcastNotification } from '@/lib/notifications'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    const openings = await db.opening.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(openings)
  } catch (error) {
    console.error('Openings GET error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (user?.role !== 'TEACHER' && user?.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { title, pgn } = await req.json()
    if (!title || !pgn) return new NextResponse('Bad Request', { status: 400 })

    const opening = await db.opening.create({
      data: {
        title,
        pgn
      }
    })

    // Broadcast notification to all users (excluding the teacher/admin who published)
    broadcastNotification({
      title: 'Новый дебютный курс',
      message: `Добавлен новый дебют: ${opening.title}`,
      link: '/?section=store',
      excludeUserId: user.id
    }).catch(() => {})

    return NextResponse.json(opening)
  } catch (error) {
    console.error('Openings POST error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
