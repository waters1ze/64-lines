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

    // Detach the student from the teacher
    await db.user.update({
      where: { id: studentId },
      data: { teacherId: null }
    })

    // Also remove any existing invites between this teacher and student so they can invite again later if needed
    await db.teacherStudentInvite.deleteMany({
      where: {
        teacherId: user.id,
        studentId: studentId
      }
    })

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Student DELETE error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
