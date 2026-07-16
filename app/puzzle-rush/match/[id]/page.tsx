import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect, notFound } from 'next/navigation'
import { PuzzleRush } from '@/components/PuzzleRush'
import { MatchLeaderboard } from '@/components/MatchLeaderboard'

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    redirect('/login?callbackUrl=/puzzle-rush/match/' + id)
  }

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) redirect('/login')

  const match = await db.puzzleRushMatch.findUnique({
    where: { id: id },
    include: {
      participants: true
    }
  })
  if (!match) notFound()

  const isParticipant = match.participants.some(p => p.userId === user.id)

  if (!isParticipant) {
    return <div className="p-20 text-center">У вас нет доступа к этому матчу.</div>
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-7xl">
        <h1 className="text-2xl font-bold mb-6 text-center">Матч в Puzzle Rush</h1>
        <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
          <div className="flex-1 max-w-5xl w-full">
            <PuzzleRush matchId={id} userId={user.id} />
          </div>
          <div className="w-full lg:w-80 shrink-0">
            <MatchLeaderboard matchId={id} currentUserId={user.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
