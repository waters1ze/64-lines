import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { db } from '@/lib/db'

// GET /api/students?available=true — свободные ученики (для учителя)
// GET /api/students — ученики текущего учителя
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const url = new URL(req.url)
    const available = url.searchParams.get('available') === 'true'

    if (available) {
      // Все ученики без учителя (teacherId === null), исключая тех, кому уже отправлено приглашение
      const pendingInvites = await db.teacherStudentInvite.findMany({
        where: { teacherId: user.id, status: 'PENDING' },
        select: { studentId: true }
      })
      const pendingStudentIds = pendingInvites.map(i => i.studentId)

      const students = await db.user.findMany({
        where: {
          role: 'STUDENT',
          teacherId: null,
          NOT: pendingStudentIds.length > 0 ? { id: { in: pendingStudentIds } } : undefined
        },
        select: { id: true, name: true, email: true, rating: true, isPremium: true },
        orderBy: [{ isPremium: 'desc' }, { name: 'asc' }]
      })
      return NextResponse.json(students)
    }

    // Свои ученики
    const students = await db.user.findMany({
      where: { teacherId: user.id },
      select: { id: true, name: true, email: true, rating: true, isPremium: true },
      orderBy: [{ isPremium: 'desc' }, { name: 'asc' }]
    })
    return NextResponse.json(students)
  } catch (error) {
    console.error('Students GET error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

// POST — прямое добавление ученика (используется внутри при принятии приглашения)
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
