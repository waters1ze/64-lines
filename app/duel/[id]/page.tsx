import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect, notFound } from 'next/navigation'
import { PuzzleRush } from '@/components/PuzzleRush'

export default async function DuelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    redirect('/login?callbackUrl=/duel/' + id)
  }

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) redirect('/login')

  const duel = await db.puzzleRushDuel.findUnique({ where: { id: id } })
  if (!duel) notFound()

  // User must be either creator or opponent
  if (duel.creatorId !== user.id && duel.opponentId !== user.id) {
    return <div className="p-20 text-center">У вас нет доступа к этой дуэли.</div>
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-5xl">
        <h1 className="text-2xl font-bold mb-6 text-center">Дуэль в Puzzle Rush</h1>
        <PuzzleRush duelId={id} userId={user.id} />
      </div>
    </div>
  )
}
