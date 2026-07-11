import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user) return new NextResponse('Unauthorized', { status: 401 })

    const body = await req.json()
    const { title, pgn, dueDate, progress, solved, attempts, teacherNote } = body

    // verify authorization
    const hw = await db.homework.findUnique({ where: { id: params.id } })
    if (!hw) return new NextResponse('Not Found', { status: 404 })

    const isTeacher = user.role === 'TEACHER' || user.role === 'ADMIN'
    if (!isTeacher && hw.studentId !== user.id) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const homework = await db.homework.update({
      where: { id: params.id },
      data: {
        ...(title && isTeacher && { title }),
        ...(pgn && isTeacher && { pgn }),
        ...(dueDate && isTeacher && { dueDate: new Date(dueDate) }),
        ...(progress !== undefined && { progress }),
        ...(solved !== undefined && { solved }),
        ...(attempts !== undefined && { attempts }),
        ...(teacherNote !== undefined && isTeacher && { teacherNote })
      }
    })

    return NextResponse.json(homework)
  } catch (error) {
    console.error('Homework PUT error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (user?.role !== 'TEACHER' && user?.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    await db.homework.delete({
      where: { id: params.id }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Homework DELETE error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
