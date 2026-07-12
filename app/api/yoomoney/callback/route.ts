import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    const text = await req.text()
    const params = new URLSearchParams(text)

    const notification_type = params.get('notification_type') || ''
    const operation_id = params.get('operation_id') || ''
    const amount = params.get('amount') || ''
    const currency = params.get('currency') || ''
    const datetime = params.get('datetime') || ''
    const sender = params.get('sender') || ''
    const codepro = params.get('codepro') || ''
    const label = params.get('label') || ''
    const sha1_hash = params.get('sha1_hash') || ''

    const secret = process.env.YOOMONEY_SECRET

    if (!secret) {
      console.error('YOOMONEY_SECRET is not set')
      return new NextResponse('OK', { status: 200 }) // Return 200 so YooMoney stops retrying, but log error
    }

    // Verify signature
    const str = `${notification_type}&${operation_id}&${amount}&${currency}&${datetime}&${sender}&${codepro}&${secret}&${label}`
    const hash = crypto.createHash('sha1').update(str).digest('hex')

    // (Early hash check removed for debugging, we check it later)

    // Payment is valid (or maybe signature failed, we want to see it). Find the purchase.
    const purchase = await db.purchase.findUnique({
      where: { id: label },
      include: { user: true, course: true, module: true }
    })

    if (!purchase) {
      return new NextResponse('OK', { status: 200 })
    }

    // DEBUG: Save the received webhook text to the comment field so we can see it
    await db.purchase.update({
      where: { id: purchase.id },
      data: { comment: `Webhook received! Hash match: ${hash === sha1_hash}. Text: ${text}` }
    })

    if (hash !== sha1_hash) {
      console.error('YooMoney hash mismatch')
      return new NextResponse('OK', { status: 200 })
    }

    if (purchase.status === 'APPROVED') {
      return new NextResponse('OK', { status: 200 })
    }

    // Approve purchase
    await db.purchase.update({
      where: { id: purchase.id },
      data: { status: 'APPROVED' }
    })

    // Grant module access if it's a module
    if (purchase.moduleId) {
      await db.moduleAccess.upsert({
        where: { userId_moduleId: { userId: purchase.userId, moduleId: purchase.moduleId } },
        update: {},
        create: { userId: purchase.userId, moduleId: purchase.moduleId }
      })
    }

    // Send course email if it's a course
    if (purchase.course) {
      try {
        const { sendCourseDeliveryEmail } = await import("@/lib/mail")
        await sendCourseDeliveryEmail(purchase.user.email, purchase.course.name, purchase.course.fileUrl || "", purchase.course.pgn)
      } catch (err) {
        console.error("Failed to send course delivery email via yoomoney callback", err)
      }
    }

    return new NextResponse('OK', { status: 200 })
  } catch (e: any) {
    console.error('YooMoney callback error:', e)
    return new NextResponse('OK', { status: 200 })
  }
}
