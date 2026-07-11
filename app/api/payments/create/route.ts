import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseId, senderName, comment } = await req.json()
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    // Check if course exists
    const course = await db.course.findUnique({ where: { id: String(courseId) } })
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Check if purchase already exists
    const existing = await db.purchase.findFirst({
      where: {
        userId: session.user.id,
        courseId: String(courseId),
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Already purchased or pending' }, { status: 400 })
    }

    // Create a pending purchase
    const purchase = await db.purchase.create({
      data: {
        userId: session.user.id,
        courseId: String(courseId),
        status: 'PENDING',
        senderName: senderName || null,
        comment: comment || null,
      },
      include: { user: true, course: true }
    })

    return NextResponse.json({ success: true, purchase })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
