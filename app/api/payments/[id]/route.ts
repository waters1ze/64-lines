import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { id } = await params
    await db.purchase.delete({ where: { id } })

    return new NextResponse('Deleted', { status: 200 })
  } catch (error) {
    console.error('DELETE PURCHASE ERROR:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
