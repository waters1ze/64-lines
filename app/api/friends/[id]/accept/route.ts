import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const request = await db.friendRequest.findUnique({ where: { id } })
  if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  if (request.receiverId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updated = await db.friendRequest.update({
    where: { id },
    data: { status: 'ACCEPTED' }
  })

  // Optional: notify the sender that the request was accepted
  await db.notification.create({
    data: {
      userId: request.senderId,
      title: 'Заявка принята',
      message: `${user.name || 'Пользователь'} принял(а) вашу заявку в друзья.`,
      link: '/?section=overview',
    }
  })

  return NextResponse.json(updated)
}
