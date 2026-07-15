import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { db } from '@/lib/db'
import { sendPushToUser } from '@/lib/push'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const url = new URL(req.url)
  const withUserId = url.searchParams.get('with')

  const currentUser = await db.user.findUnique({
    where: { id: userId },
    select: { isPremium: true }
  })
  
  const isPremium = currentUser?.isPremium ?? false
  
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  let messages: any[] = []
  if (withUserId) {
    messages = await db.message.findMany({
      where: {
        AND: [
          {
            OR: [
              { senderId: userId, receiverId: withUserId },
              { senderId: withUserId, receiverId: userId }
            ]
          },
          ...(isPremium ? [] : [{ createdAt: { gte: thirtyDaysAgo } }])
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
      AND: [
        {
          OR: [
            { senderId: userId },
            { receiverId: userId }
          ]
        },
        ...(isPremium ? [] : [{ createdAt: { gte: thirtyDaysAgo } }])
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

  const fullCurrentUser = await db.user.findUnique({
    where: { id: userId },
    include: { teacher: true, students: true }
  })

  // Mark the assigned teacher with a special flag
  if (fullCurrentUser?.teacher) {
    if (contactsMap.has(fullCurrentUser.teacher.id)) {
      contactsMap.get(fullCurrentUser.teacher.id).isMyTeacher = true
    } else {
      contactsMap.set(fullCurrentUser.teacher.id, {
        id: fullCurrentUser.teacher.id,
        name: fullCurrentUser.teacher.name,
        role: fullCurrentUser.teacher.role,
        isMyTeacher: true
      })
    }
  }

  if (fullCurrentUser?.students) {
    fullCurrentUser.students.forEach((s: any) => {
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

  // Send push notification to receiver
  const senderName = message.sender.name || 'Пользователь'
  const textPreview = message.content.length > 60 ? `${message.content.substring(0, 60)}...` : message.content
  await sendPushToUser(message.receiverId, {
    title: `Новое сообщение от ${senderName}`,
    body: textPreview,
    url: `/?section=chat&contactId=${session.user.id}`
  }).catch((e) => console.error('Chat push notify error:', e))

  return NextResponse.json(message)
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const withUserId = url.searchParams.get('with')
  
  if (!withUserId) {
    return NextResponse.json({ error: 'Missing with parameter' }, { status: 400 })
  }

  const userId = session.user.id

  await db.message.deleteMany({
    where: {
      OR: [
        { senderId: userId, receiverId: withUserId },
        { senderId: withUserId, receiverId: userId }
      ]
    }
  })

  return NextResponse.json({ success: true })
}
