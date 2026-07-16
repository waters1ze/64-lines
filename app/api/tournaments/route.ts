import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { broadcastNotification } from '@/lib/notifications'

export async function GET() {
  try {
    const tournaments = await db.tournament.findMany({
      where: { endsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' }
    })
    return NextResponse.json(tournaments)
  } catch (error) {
    console.error('GET /api/tournaments error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { title, description, lichessUrl, startsAt, endsAt } = await req.json()
    if (!title || !lichessUrl || !startsAt || !endsAt) {
      return NextResponse.json({ error: 'Обязательные поля: title, lichessUrl, startsAt, endsAt' }, { status: 400 })
    }

    const tournament = await db.tournament.create({
      data: {
        title,
        description: description || null,
        lichessUrl,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt)
      }
    })

    // Broadcast to all users
    broadcastNotification({
      title: '🏆 Новый турнир',
      message: `Объявлен турнир: ${tournament.title}`,
      link: '/?section=overview',
      excludeUserId: user.id
    }).catch(() => {})

    return NextResponse.json({ tournament })
  } catch (error) {
    console.error('POST /api/tournaments error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
