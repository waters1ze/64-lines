import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (user?.role !== 'TEACHER' && user?.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const studentId = params.id

    // Just unlink the student from the teacher instead of deleting the account entirely
    // This preserves their purchases and progress if they use the platform independently
    await db.user.update({
      where: { id: studentId, teacherId: user.id },
      data: { teacherId: null }
    })

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Student DELETE error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
