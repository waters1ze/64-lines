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

    const { studentId } = await req.json()
    if (!studentId) return new NextResponse('Bad Request', { status: 400 })

    const updatedStudent = await db.user.update({
      where: { id: studentId },
      data: { teacherId: user.id }
    })

    return NextResponse.json(updatedStudent)
  } catch (error) {
    console.error('Add student error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
