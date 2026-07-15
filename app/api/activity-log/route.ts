import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    // Set to midnight
    ninetyDaysAgo.setHours(0, 0, 0, 0)

    const logs = await db.activityLog.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: ninetyDaysAgo
        }
      },
      select: {
        date: true
      },
      orderBy: {
        date: 'asc'
      }
    })

    const dates = logs.map(log => log.date.toISOString().split('T')[0])
    return NextResponse.json({ dates })
  } catch (error) {
    console.error('Activity log GET error:', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
