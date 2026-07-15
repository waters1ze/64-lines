import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { db } from '@/lib/db'
import { broadcastNotification } from '@/lib/notifications'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (user?.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { name, description, price, imageUrl, fileUrl, pgn, isPremium } = await req.json()
    if (!name) return new NextResponse('Bad Request', { status: 400 })

    const course = await db.course.create({
      data: {
        name,
        description,
        price: Number(price) || 0,
        imageUrl,
        fileUrl,
        pgn,
        isPremium: Boolean(isPremium)
      }
    })

    // Broadcast notification to all users (excluding the admin who published)
    broadcastNotification({
      title: 'Новый курс',
      message: `Доступен новый курс: ${course.name}`,
      link: '/?section=modules',
      excludeUserId: user.id
    }).catch(() => {})

    return NextResponse.json(course)
  } catch (error) {
    console.error('Courses POST error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
