import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

    const teacher = await db.user.findUnique({ where: { email: session.user.email } })
    if (teacher?.role !== 'TEACHER' && teacher?.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { purchaseId } = await req.json()
    if (!purchaseId) return new NextResponse('Bad Request', { status: 400 })

    const purchase = await db.purchase.update({
      where: { id: purchaseId },
      data: { status: 'REJECTED' }
    })

    return NextResponse.json({ purchase })
  } catch (error) {
    console.error('Payment reject error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
