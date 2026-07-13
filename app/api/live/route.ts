import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  // Cleanup old sessions (older than 2 days)
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)
  await db.liveSession.deleteMany({
    where: { createdAt: { lt: twoDaysAgo } }
  })

  const activeSession = await db.liveSession.findFirst({
    where: {
      OR: [ { teacherId: userId }, { studentId: userId } ],
      status: 'ACTIVE'
    },
    include: {
      teacher: { select: { id: true, name: true } },
      student: { select: { id: true, name: true } }
    }
  })

  // Hack: temporarily log this so we can see what's happening in prod
  await db.message.create({
    data: {
      senderId: userId,
      receiverId: userId,
      content: `Poll /api/live. userId: ${userId}, role: ${session?.user?.role}, activeSession: ${activeSession ? activeSession.id : 'none'}`
    }
  }).catch(() => {})

  return NextResponse.json(
    { session: activeSession },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !['TEACHER', 'ADMIN'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { studentId } = await req.json()
  if (!studentId) return NextResponse.json({ error: 'Student ID required' }, { status: 400 })

  // Check if there is already an active session
  const existing = await db.liveSession.findFirst({
    where: { teacherId: session.user.id, status: 'ACTIVE' }
  })
  if (existing) {
    // End the existing one
    await db.liveSession.update({ where: { id: existing.id }, data: { status: 'ENDED' } })
  }

  const roomName = `chess-lesson-${Date.now()}-${Math.floor(Math.random()*1000)}`
  const newSession = await db.liveSession.create({
    data: {
      teacherId: session.user.id,
      studentId,
      jitsiRoomName: roomName
    },
    include: {
      teacher: { select: { id: true, name: true } },
      student: { select: { id: true, name: true } }
    }
  })

  return NextResponse.json({ session: newSession })
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const body = await req.json()
  const { sessionId, pgn, currentFen, activeMoveId, status } = body

  if (!sessionId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 })

  const existing = await db.liveSession.findUnique({ where: { id: sessionId } })
  if (!existing || (existing.teacherId !== userId && existing.studentId !== userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updated = await db.liveSession.update({
    where: { id: sessionId },
    data: {
      ...(pgn !== undefined && { pgn }),
      ...(currentFen !== undefined && { currentFen }),
      ...(activeMoveId !== undefined && { activeMoveId }),
      ...(status !== undefined && { status }),
      lastUpdated: new Date()
    },
    include: {
      teacher: { select: { id: true, name: true } },
      student: { select: { id: true, name: true } }
    }
  })

  return NextResponse.json({ session: updated })
}
