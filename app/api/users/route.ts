import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        rating: true,
        emailVerified: true,
      },
      orderBy: { role: 'asc' }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Users GET error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

    const caller = await db.user.findUnique({ where: { email: session.user.email } })
    if (!caller || (caller.role !== 'TEACHER' && caller.role !== 'ADMIN')) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { userId, role } = await req.json()
    if (!userId || !role || !['ADMIN', 'TEACHER', 'STUDENT'].includes(role)) {
      return new NextResponse('Bad Request', { status: 400 })
    }

    // Нельзя менять роль самому себе
    if (userId === caller.id) {
      return NextResponse.json({ error: 'Нельзя изменить свою собственную роль' }, { status: 400 })
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true, rating: true }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Users PUT error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
