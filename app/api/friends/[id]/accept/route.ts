import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const request = await db.friendRequest.findUnique({ where: { id: params.id } })
  if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  if (request.receiverId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updated = await db.friendRequest.update({
    where: { id: params.id },
    data: { status: 'ACCEPTED' }
  })

  return NextResponse.json(updated)
}
