import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { score } = await req.json()
    if (typeof score !== 'number') {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
    }

    const participant = await db.puzzleRushMatchParticipant.findUnique({
      where: { matchId_userId: { matchId, userId: user.id } }
    })

    if (!participant || participant.status !== 'ACCEPTED') {
      return NextResponse.json({ error: 'Not an active participant' }, { status: 403 })
    }

    // Update score and finished time
    await db.puzzleRushMatchParticipant.update({
      where: { id: participant.id },
      data: { score, finishedAt: new Date() }
    })

    await db.user.update({
      where: { id: user.id },
      data: { seasonPuzzlesSolved: (user.seasonPuzzlesSolved || 0) + score }
    })

    // Check if everyone accepted has finished
    const match = await db.puzzleRushMatch.findUnique({
      where: { id: matchId },
      include: { participants: true }
    })

    if (match) {
      const activeParticipants = match.participants.filter(p => p.status === 'ACCEPTED')
      // If someone has no startedAt but is ACCEPTED, they haven't finished. 
      // If they have startedAt but no finishedAt, they haven't finished.
      // So all activeParticipants must have finishedAt !== null to be considered finished.
      const allFinished = activeParticipants.every(p => p.finishedAt !== null)
      
      if (allFinished && activeParticipants.length > 0) {
        await db.puzzleRushMatch.update({
          where: { id: matchId },
          data: { status: 'FINISHED', finishedAt: new Date() }
        })

        // Find winner (highest score) and create ActivityEvent
        const winner = activeParticipants.reduce((best, p) =>
          (p.score ?? 0) > (best.score ?? 0) ? p : best
        )
        if (winner) {
          try {
            await db.activityEvent.create({
              data: {
                userId: winner.userId,
                type: 'MATCH_WIN',
                message: `Победа в матче Puzzle Rush со счётом ${winner.score ?? 0}! ⚔️`
              }
            })
          } catch (e) {
            console.error('ActivityEvent MATCH_WIN error:', e)
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting match score:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
