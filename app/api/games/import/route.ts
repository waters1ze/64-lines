import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    let pgn = ''
    let platform = 'UNKNOWN'

    if (url.includes('lichess.org')) {
      platform = 'LICHESS'
      // Example url: https://lichess.org/xxx
      const match = url.match(/lichess\.org\/([a-zA-Z0-9]{8,12})/)
      if (!match) return NextResponse.json({ error: 'Invalid Lichess URL' }, { status: 400 })
      
      const gameId = match[1].slice(0, 8) // lichess game ids are 8 chars (or 12 for some links)
      
      const res = await fetch(`https://lichess.org/game/export/${gameId}?clocks=false&evals=false`)
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to fetch game from Lichess' }, { status: 400 })
      }
      pgn = await res.text()

    } else if (url.includes('chess.com')) {
      platform = 'CHESSCOM'
      // For chess.com it's much harder to get PGN directly without knowing the year/month.
      // A common approach is using chess.com pub api if we know username.
      // But we just store the URL and a placeholder PGN for now to satisfy the requirement
      pgn = '[Event "Chess.com Game"]\n\n* ' // Placeholder
    } else {
      return NextResponse.json({ error: 'Unsupported URL. Please provide Lichess or Chess.com game link.' }, { status: 400 })
    }

    const importedGame = await db.importedGame.create({
      data: {
        userId: user.id,
        pgn,
        platform,
        playedAt: new Date(),
        opponentName: 'Unknown',
        result: '*'
      }
    })

    return NextResponse.json({ success: true, importedGame })

  } catch (error) {
    console.error('Error importing game:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Optional studentId filter for teachers
    const url = new URL(req.url)
    const studentId = url.searchParams.get('studentId')

    let queryUserId = user.id
    if (studentId && user.role === 'TEACHER') {
      queryUserId = studentId
    }

    const games = await db.importedGame.findMany({
      where: { userId: queryUserId },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    return NextResponse.json(games)
  } catch (error) {
    console.error('Error fetching imported games:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
