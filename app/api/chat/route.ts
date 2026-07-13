import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const url = new URL(req.url)
  const withUserId = url.searchParams.get('with')

  // Auto cleanup messages older than 48 hours
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)
  await db.message.deleteMany({
    where: { createdAt: { lt: twoDaysAgo } }
  })

  let messages: any[] = []
  if (withUserId) {
    messages = await db.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: withUserId },
          { senderId: withUserId, receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { name: true, role: true } },
        receiver: { select: { name: true, role: true } }
      }
    })
  }

  // Also get the latest message for each conversation for the contacts list
  const allUserMessages = await db.message.findMany({
    where: {
      OR: [
        { senderId: userId },
        { receiverId: userId }
      ]
    },
    orderBy: { createdAt: 'desc' },
    include: {
      sender: { select: { id: true, name: true, role: true } },
      receiver: { select: { id: true, name: true, role: true } }
    }
  })

  const contactsMap = new Map()
  allUserMessages.forEach(m => {
    const isSender = m.senderId === userId
    const contact = isSender ? m.receiver : m.sender
    if (!contactsMap.has(contact.id)) {
      contactsMap.set(contact.id, {
        id: contact.id,
        name: contact.name,
        role: contact.role,
        lastMessage: m.content,
        lastMessageTime: m.createdAt
      })
    }
  })

  const currentUser = await db.user.findUnique({
    where: { id: userId },
    include: { teacher: true, students: true }
  })

  if (currentUser?.teacher && !contactsMap.has(currentUser.teacher.id)) {
    contactsMap.set(currentUser.teacher.id, {
      id: currentUser.teacher.id,
      name: currentUser.teacher.name,
      role: currentUser.teacher.role,
    })
  }

  if (currentUser?.students) {
    currentUser.students.forEach((s: any) => {
      if (!contactsMap.has(s.id)) {
        contactsMap.set(s.id, {
          id: s.id,
          name: s.name,
          role: s.role,
        })
      }
    })
  }

  return NextResponse.json({
    messages,
    contacts: Array.from(contactsMap.values())
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.receiverId || !body.content?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const message = await db.message.create({
    data: {
      senderId: session.user.id,
      receiverId: body.receiverId,
      content: body.content.trim()
    },
    include: {
      sender: { select: { name: true, role: true } },
      receiver: { select: { name: true, role: true } }
    }
  })

  return NextResponse.json(message)
}
