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

    // 1.5 If it's a module, grant module access
    if (purchase.moduleId) {
      await db.moduleAccess.upsert({
        where: { userId_moduleId: { userId: purchase.userId, moduleId: purchase.moduleId } },
        update: {},
        create: { userId: purchase.userId, moduleId: purchase.moduleId }
      })
    }
    
    // 1.6 If it's a SUBSCRIPTION, grant premium
    if (purchase.type === 'SUBSCRIPTION') {
      const now = new Date()
      const until = new Date(now)
      until.setDate(until.getDate() + 30) // 30 days subscription
      
      await db.user.update({
        where: { id: purchase.userId },
        data: {
          isPremium: true,
          premiumUntil: until
        }
      })
    }
    
    // 1.7 If it's an ANALYSIS, create GameAnalysisRequest
    if (purchase.type === 'ANALYSIS') {
      const pgnMatch = purchase.comment?.match(/PGN: ([\s\S]*?)(?:\n\n|$)/)
      const pgn = pgnMatch ? pgnMatch[1] : ''
      const userComment = purchase.comment?.replace(/PGN: [\s\S]*?(?:\n\n|$)/, '').trim()
      
      await db.gameAnalysisRequest.create({
        data: {
          userId: purchase.userId,
          pgn: pgn || 'PGN not provided',
          comment: userComment || null,
          status: 'PENDING'
        }
      })
    }

    // 2. Send Email (Only for courses with PGN currently, but can be adapted)
    if (purchase.course) {
      try {
        const { sendCourseDeliveryEmail } = await import("@/lib/mail")
        await sendCourseDeliveryEmail(purchase.user.email, purchase.course.name, purchase.course.fileUrl || "", purchase.course.pgn)
      } catch (err) {
        console.error("Failed to send course delivery email", err)
      }
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
