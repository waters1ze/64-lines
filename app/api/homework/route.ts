import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (user?.role !== 'TEACHER' && user?.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { title, pgn, studentId, dueDate, rating } = await req.json()
    if (!title || !studentId) return new NextResponse('Bad Request', { status: 400 })

    const homework = await db.homework.create({
      data: {
        title,
        pgn: pgn || '',
        studentId,
        rating: rating ? parseInt(rating) : null,
        ...(dueDate && { dueDate: new Date(dueDate) })
      }
    })

    return NextResponse.json(homework)
  } catch (error) {
    console.error('Homework POST error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
