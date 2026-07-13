import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const top = await db.user.findMany({
      where: { 
        role: 'STUDENT',
        homeworks: { some: { solved: true } }
      },
      select: {
        id: true,
        name: true,
        rating: true,
        _count: { select: { homeworks: true } }
      },
      orderBy: { rating: 'desc' },
      take: 50
    })

    return NextResponse.json(top)
  } catch (error) {
    console.error('Leaderboard GET error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
