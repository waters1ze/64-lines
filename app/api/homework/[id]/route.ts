import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user) return new NextResponse('Unauthorized', { status: 401 })

    const body = await req.json()
    const { title, pgn, dueDate, progress, solved, attempts, teacherNote } = body

    const hw = await db.homework.findUnique({ where: { id } })
    if (!hw) return new NextResponse('Not Found', { status: 404 })

    const isTeacher = user.role === 'TEACHER' || user.role === 'ADMIN'
    if (!isTeacher && hw.studentId !== user.id) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Начисляем рейтинг ТОЛЬКО если задача решена впервые
    let ratingDelta = 0
    if (!isTeacher && solved === true && !hw.solved) {
      const currentAttempts = (attempts !== undefined ? attempts : hw.attempts) || 1
      if (currentAttempts <= 1) ratingDelta = 15
      else if (currentAttempts === 2) ratingDelta = 10
      else ratingDelta = 5

      await db.user.update({
        where: { id: user.id },
        data: { rating: { increment: ratingDelta } }
      })
    }

    const homework = await db.homework.update({
      where: { id },
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

    return NextResponse.json({ ...homework, ratingDelta })
  } catch (error) {
    console.error('Homework PUT error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (user?.role !== 'TEACHER' && user?.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const hw = await db.homework.findUnique({ where: { id } })
    if (!hw) return new NextResponse('Not Found', { status: 404 })

    await db.homework.delete({ where: { id } })

    return new NextResponse(JSON.stringify({ success: true }), { status: 200 })
  } catch (error) {
    console.error('Homework DELETE error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
