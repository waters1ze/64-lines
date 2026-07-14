import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'

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

    return NextResponse.json({ success: true, video })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
