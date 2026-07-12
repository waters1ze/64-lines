import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const purchases = await db.purchase.findMany({
      where: { userId: session.user.id },
      include: { course: true, module: true },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(purchases)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
