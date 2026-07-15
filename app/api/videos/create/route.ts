import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'
import { broadcastNotification } from '@/lib/notifications'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, meta, url, isPremium } = await req.json()
    if (!title || !url) {
      return NextResponse.json({ error: 'Title and URL are required' }, { status: 400 })
    }

    const video = await db.video.create({
      data: { title, meta: meta || '', url, isPremium: !!isPremium }
    })

    // Broadcast notification to all users (excluding the admin who published)
    broadcastNotification({
      title: 'Новое видео',
      message: `Вышло новое видео: ${video.title}`,
      link: '/?section=videos',
      excludeUserId: session.user.id
    }).catch(() => {})

    return NextResponse.json({ success: true, video })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

