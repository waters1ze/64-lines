import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const subscription = await req.json()
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    const { endpoint, keys } = subscription
    const { p256dh, auth } = keys

    if (!p256dh || !auth) {
      return NextResponse.json({ error: 'Missing keys' }, { status: 400 })
    }

    // Upsert subscription by endpoint
    await db.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: session.user.id,
        p256dh,
        auth
      },
      create: {
        userId: session.user.id,
        endpoint,
        p256dh,
        auth
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push subscribe error:', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
