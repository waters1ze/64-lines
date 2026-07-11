import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: studentId } = await params;
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (user?.role !== 'TEACHER' && user?.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // First verify the student belongs to the teacher
    const student = await db.user.findUnique({ where: { id: studentId } })
    if (student?.teacherId !== user.id) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Delete all homeworks associated with the student to avoid foreign key constraints
    await db.homework.deleteMany({
      where: { studentId: studentId }
    })

    // Delete the student account entirely
    await db.user.delete({
      where: { id: studentId }
    })

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Student DELETE error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
