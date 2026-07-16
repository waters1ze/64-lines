import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await db.user.findUnique({
      where: { email: session.user.email }
    })

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 1. Get current active season
    const activeSeason = await db.season.findFirst({
      where: { isActive: true }
    })

    if (!activeSeason) {
      return NextResponse.json({ error: 'No active season found' }, { status: 400 })
    }

    // 2. Mark current season as inactive and set endsAt
    await db.season.update({
      where: { id: activeSeason.id },
      data: { isActive: false, endsAt: new Date() }
    })

    // 3. Reset seasonRating and seasonPuzzlesSolved for all users
    await db.user.updateMany({
      data: {
        seasonRating: 1500,
        seasonPuzzlesSolved: 0
      }
    })

    // 4. Create new season
    const newSeason = await db.season.create({
      data: {
        name: `Сезон ${new Date().toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}`,
        startsAt: new Date(),
        endsAt: new Date(new Date().setMonth(new Date().getMonth() + 1)), // roughly 1 month
        isActive: true
      }
    })

    return NextResponse.json({ success: true, message: 'Season ended and new season started', newSeason })

  } catch (error) {
    console.error('Error ending season:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
