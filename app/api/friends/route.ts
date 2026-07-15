import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // GET all friends (where status is ACCEPTED and user is either sender or receiver)
  const acceptedRequests = await db.friendRequest.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [ { senderId: user.id }, { receiverId: user.id } ]
    },
    include: { sender: true, receiver: true }
  })

  // GET incoming pending requests
  const pendingIncoming = await db.friendRequest.findMany({
    where: { receiverId: user.id, status: 'PENDING' },
    include: { sender: true }
  })

  // GET outgoing pending requests
  const pendingOutgoing = await db.friendRequest.findMany({
    where: { senderId: user.id, status: 'PENDING' },
    include: { receiver: true }
  })

  const friends = acceptedRequests.map(r => r.senderId === user.id ? r.receiver : r.sender)

  return NextResponse.json({ friends, pendingIncoming, pendingOutgoing })
}
