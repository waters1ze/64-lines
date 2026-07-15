import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { receiverId } = await req.json()
  if (user.id === receiverId) return NextResponse.json({ error: 'Cannot add yourself' }, { status: 400 })

  const existing = await db.friendRequest.findFirst({
    where: {
      OR: [
        { senderId: user.id, receiverId },
        { senderId: receiverId, receiverId: user.id }
      ]
    }
  })

  if (existing) {
    return NextResponse.json({ error: 'Request already exists or accepted' }, { status: 400 })
  }

  const request = await db.friendRequest.create({
    data: { senderId: user.id, receiverId }
  })

  return NextResponse.json(request)
}
