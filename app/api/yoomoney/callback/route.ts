import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'
import { sendPushToUser } from '@/lib/push'

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
    // YooMoney sends sha1_hash for wallet transfers, sign for card payments
    const sha1_hash = params.get('sha1_hash') || params.get('sign') || ''

    const secret = process.env.YOOMONEY_SECRET

    if (!secret) {
      console.error('YOOMONEY_SECRET is not set')
      return new NextResponse('OK', { status: 200 })
    }

    // Verify signature — same formula for both wallet and card
    const str = `${notification_type}&${operation_id}&${amount}&${currency}&${datetime}&${sender}&${codepro}&${secret}&${label}`
    const hash = crypto.createHash('sha1').update(str).digest('hex')

    console.log('YooMoney webhook. label:', label, 'hashMatch:', hash === sha1_hash, 'type:', notification_type)

    // Find the purchase by label
    const purchaseTemp = await db.purchase.findUnique({
      where: { id: label },
      include: { user: true, course: true, module: true }
    })

    if (!purchaseTemp) {
      console.error('Purchase not found for label:', label)
      return new NextResponse('OK', { status: 200 })
    }

    if (hash !== sha1_hash) {
      console.error('YooMoney hash mismatch. Expected:', hash, 'Got:', sha1_hash)
      // Store debug info
      await db.purchase.update({
        where: { id: purchaseTemp.id },
        data: { comment: `Hash mismatch! expected=${hash} got=${sha1_hash} secret_len=${secret.length}` }
      })
      return new NextResponse('OK', { status: 200 })
    }

    // Verify Amount
    const amountVal = parseFloat(amount) || 0
    const withdrawVal = parseFloat(params.get('withdraw_amount') || '') || 0
    const maxPaid = Math.max(amountVal, withdrawVal)
    
    const expected = purchaseTemp.amount ?? purchaseTemp.course?.price ?? purchaseTemp.module?.price ?? 0
    let fallbackExpected = expected
    if (fallbackExpected === 0) {
      if (purchaseTemp.type === 'SUBSCRIPTION' || purchaseTemp.type === 'PREMIUM') {
        const settings = await db.settings.findUnique({ where: { id: 'global' } }) || { subscriptionPrice: 300 }
        fallbackExpected = settings.subscriptionPrice
      } else if (purchaseTemp.type === 'ANALYSIS') {
        const settings = await db.settings.findUnique({ where: { id: 'global' } }) || { analysisPrice: 70 }
        fallbackExpected = settings.analysisPrice
      }
    }

    console.log(`YooMoney payment values for label ${label}: amount=${amountVal}, withdraw_amount=${withdrawVal}, expected=${fallbackExpected}`)

    const hasSufficientAmount = maxPaid >= (fallbackExpected * 0.97)

    if (!hasSufficientAmount) {
      console.error(`Insufficient payment amount for purchase ${label}. Expected: ${fallbackExpected}, Paid (max): ${maxPaid}`)
      
      // Mark purchase as requiring manual review in comment
      const commentMsg = `WARNING: underpayment! expected=${fallbackExpected} paid=${maxPaid} (amount=${amountVal}, withdraw=${withdrawVal})`
      await db.purchase.update({
        where: { id: purchaseTemp.id },
        data: { comment: commentMsg }
      })
      
      // Notify admin
      try {
        const admin = await db.user.findFirst({ where: { role: 'ADMIN' } })
        if (admin) {
          await db.notification.create({
            data: {
              userId: admin.id,
              title: '⚠️ Недоплата по платежу ЮMoney',
              message: `Пользователь ${purchaseTemp.user.email} оплатил ${maxPaid} ₽ вместо ${fallbackExpected} ₽ за заказ ${purchaseTemp.id}. Проверьте вручную.`,
              link: `?section=sales`
            }
          })

          await sendPushToUser(admin.id, {
            title: '⚠️ Недоплата по платежу ЮMoney',
            body: `Пользователь ${purchaseTemp.user.email} оплатил ${maxPaid} ₽ вместо ${fallbackExpected} ₽ за заказ ${purchaseTemp.id}.`,
            url: '/?section=sales'
          }).catch((e) => console.error('Yoomoney callback underpayment admin push error:', e))
        }
      } catch (eAdmin) {
        console.error('Failed to notify admin on underpayment:', eAdmin)
      }
      
      return new NextResponse('OK', { status: 200 })
    }

    // Approve purchase atomically using a transaction to prevent race conditions
    const result = await db.$transaction(async (tx) => {
      const p = await tx.purchase.findUnique({
        where: { id: label },
        include: { user: true, course: true, module: true }
      })

      if (!p) {
        throw new Error('Purchase not found')
      }

      if (p.status === 'APPROVED') {
        throw new Error('Already approved')
      }

      const updated = await tx.purchase.update({
        where: { id: p.id },
        data: { status: 'APPROVED', comment: null },
        include: { user: true, course: true, module: true }
      })

      return { purchase: updated }
    }).catch(err => {
      return { error: err.message }
    })

    if ('error' in result) {
      if (result.error === 'Already approved') {
        return new NextResponse('OK', { status: 200 })
      }
      console.error('YooMoney callback transaction error:', result.error)
      return new NextResponse('OK', { status: 200 })
    }

    const { purchase } = result

    // Grant premium if it's a subscription
    if (purchase.type === 'PREMIUM' || purchase.type === 'SUBSCRIPTION') {
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

    // Grant module access if it's a module
    if (purchase.moduleId) {
      await db.moduleAccess.upsert({
        where: { userId_moduleId: { userId: purchase.userId, moduleId: purchase.moduleId } },
        update: {},
        create: { userId: purchase.userId, moduleId: purchase.moduleId }
      })
    }

    // Create GameAnalysisRequest if it's an ANALYSIS
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

    // Send course email if it's a course
    if (purchase.course) {
      try {
        const { sendCourseDeliveryEmail } = await import('@/lib/mail')
        await sendCourseDeliveryEmail(purchase.user.email, purchase.course.name, purchase.course.fileUrl || '', purchase.course.pgn)
      } catch (err) {
        console.error('Failed to send course delivery email via yoomoney callback', err)
      }
    }

    // Notify user
    const pushMsg = `Ваш платеж успешно подтвержден. ${purchase.course ? 'Курс доступен!' : purchase.moduleId ? 'Доступ к модулю открыт!' : purchase.type === 'SUBSCRIPTION' || purchase.type === 'PREMIUM' ? 'Вам начислен Premium!' : ''}`
    await db.notification.create({
      data: {
        userId: purchase.userId,
        title: 'Оплата прошла успешно',
        message: pushMsg,
        link: purchase.course ? `?section=courseViewer&courseId=${purchase.courseId}` : ''
      }
    })

    await sendPushToUser(purchase.userId, {
      title: 'Оплата прошла успешно',
      body: pushMsg,
      url: purchase.course ? `/?section=courseViewer&courseId=${purchase.courseId}` : '/'
    }).catch((e) => console.error('Yoomoney callback user push error:', e))

    return new NextResponse('OK', { status: 200 })
  } catch (e: any) {
    console.error('YooMoney callback error:', e)
    return new NextResponse('OK', { status: 200 })
  }
}
