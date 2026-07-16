import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (user?.role !== 'ADMIN' && user?.role !== 'TEACHER') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { id } = await params
    if (!id) return new NextResponse('Bad Request', { status: 400 })

    await db.category.delete({
      where: { id }
    })

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Category DELETE error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
