import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Get top PuzzleRushResult distinct by userId (highest score first)
    const topScores = await db.puzzleRushResult.findMany({
      distinct: ['userId'],
      orderBy: [
        { userId: 'asc' }, // Distinct requires orderBy to start with the distinct field or be sorted
      ],
    })

    // Wait! In Prisma, distinct with orderBy must match distinct fields first. 
    // To avoid Prisma-specific orderBy/distinct limitations, we can just fetch all records sorted by score desc,
    // and filter distinct userIds in memory (since there won't be millions of records initially).
    // This is 100% database-agnostic and extremely safe against Prisma distinct-sorting constraints!
    const allScores = await db.puzzleRushResult.findMany({
      orderBy: {
        score: 'desc'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    const seenUsers = new Set<string>()
    const results: any[] = []

    for (const item of allScores) {
      if (!seenUsers.has(item.userId)) {
        seenUsers.add(item.userId)
        results.push({
          id: item.id,
          userId: item.userId,
          score: item.score,
          playedAt: item.playedAt,
          name: item.user.name || item.user.email.split('@')[0],
          role: item.user.role
        })
      }
      if (results.length >= 20) break
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Puzzle Rush leaderboard GET error:', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
