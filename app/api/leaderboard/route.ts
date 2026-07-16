import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const period = url.searchParams.get('period') // 'week' | 'month' | 'season' | null

    if (period === 'season') {
      const top = await db.user.findMany({
        select: {
          id: true,
          name: true,
          seasonRating: true,
          isPremium: true,
          seasonPuzzlesSolved: true,
          _count: { select: { homeworks: true } }
        },
        orderBy: { seasonRating: 'desc' },
        take: 50
      })
      
      return NextResponse.json(top.map(u => ({
        ...u,
        rating: u.seasonRating, // Map to rating so UI can just render it
        puzzlesSolvedTotal: u.seasonPuzzlesSolved // Map to puzzlesSolvedTotal for UI
      })))
    }

    if (period === 'week' || period === 'month') {
      const days = period === 'week' ? 7 : 30
      const threshold = new Date()
      threshold.setDate(threshold.getDate() - days)

      const groupResults = await db.solvedPuzzle.groupBy({
        by: ['userId'],
        _count: {
          puzzleId: true
        },
        where: {
          solvedAt: {
            gte: threshold
          }
        },
        orderBy: {
          _count: {
            puzzleId: 'desc'
          }
        },
        take: 50
      })

      const userIds = groupResults.map(r => r.userId)
      const users = await db.user.findMany({
        where: {
          id: { in: userIds }
        },
        select: {
          id: true,
          name: true,
          rating: true,
          isPremium: true,
          puzzlesSolvedTotal: true,
          _count: { select: { homeworks: true } }
        }
      })

      const usersMap = new Map(users.map(u => [u.id, u]))
      const top = groupResults
        .map(r => {
          const u = usersMap.get(r.userId)
          if (!u) return null
          return {
            ...u,
            solvedCount: r._count.puzzleId
          }
        })
        .filter(Boolean)

      return NextResponse.json(top)
    }

    // Default: all-time top by rating
    const top = await db.user.findMany({
      select: {
        id: true,
        name: true,
        rating: true,
        isPremium: true,
        puzzlesSolvedTotal: true,
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
