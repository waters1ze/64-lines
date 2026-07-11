import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (user?.role !== 'TEACHER' && user?.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')

    if (!q || q.length < 2) {
      return NextResponse.json([])
    }

    const students = await db.user.findMany({
      where: {
        email: { contains: q, mode: 'insensitive' },
        role: 'STUDENT',
        teacherId: null // Only find students not already assigned to a teacher
      },
      select: { id: true, name: true, email: true, rating: true },
      take: 5
    })

    return NextResponse.json(students)
  } catch (error) {
    console.error('Search students error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
