import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { purchaseId } = await req.json()
    if (!purchaseId) {
      return NextResponse.json({ error: 'Purchase ID is required' }, { status: 400 })
    }

    const purchase = await db.purchase.findUnique({
      where: { id: String(purchaseId) },
      include: { user: true, course: true }
    })

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    if (purchase.status === 'APPROVED') {
      return NextResponse.json({ error: 'Already approved' }, { status: 400 })
    }

    // 1. Update purchase status
    await db.purchase.update({
      where: { id: purchase.id },
      data: { status: 'APPROVED' }
    })

    // 2. Send Email
    try {
      const { sendCourseDeliveryEmail } = await import("@/lib/mail")
      await sendCourseDeliveryEmail(purchase.user.email, purchase.course.name, purchase.course.fileUrl || "", purchase.course.pgn)
    } catch (err) {
      console.error("Failed to send course delivery email", err)
      // We don't fail the approval if email fails
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
