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

    const { courseId, moduleId, type, senderName, comment, paymentMethod, pgn } = await req.json()
    
    let amount = 0
    // For course/module
    if (!type || type === 'COURSE' || type === 'MODULE') {
      if (!courseId && !moduleId) {
        return NextResponse.json({ error: 'Course ID or Module ID is required' }, { status: 400 })
      }
      if (courseId) {
        const course = await db.course.findUnique({ where: { id: String(courseId) } })
        if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
        amount = course.price
      } else if (moduleId) {
        const mod = await db.module.findUnique({ where: { id: String(moduleId) } })
        if (!mod) return NextResponse.json({ error: 'Module not found' }, { status: 404 })
        amount = mod.price
      }
    } else if (type === 'SUBSCRIPTION' || type === 'PREMIUM') {
      const settings = await db.settings.findUnique({ where: { id: 'global' } }) || { subscriptionPrice: 300 }
      amount = settings.subscriptionPrice
    } else if (type === 'ANALYSIS') {
      const settings = await db.settings.findUnique({ where: { id: 'global' } }) || { analysisPrice: 70 }
      amount = settings.analysisPrice
    }

    // Check if purchase already exists (only for COURSE/MODULE)
    if (!type || type === 'COURSE' || type === 'MODULE') {
      const existing = await db.purchase.findFirst({
        where: {
          userId: session.user.id,
          ...(courseId ? { courseId: String(courseId) } : {}),
          ...(moduleId ? { moduleId: String(moduleId) } : {}),
        }
      })

      if (existing) {
        if (existing.status === 'APPROVED') {
          return NextResponse.json({ error: 'Already purchased' }, { status: 400 })
        }
        const updated = await db.purchase.update({
          where: { id: existing.id },
          data: { 
            senderName: senderName || null, 
            comment: comment || null,
            paymentMethod: paymentMethod || 'sbp',
            amount: amount
          },
          include: { user: true, course: true, module: true }
        })
        return NextResponse.json({ success: true, purchase: updated })
      }
    }

    const purchase = await db.purchase.create({
      data: {
        userId: session.user.id,
        courseId: courseId ? String(courseId) : null,
        moduleId: moduleId ? String(moduleId) : null,
        type: type || 'COURSE',
        amount: amount,
        status: 'PENDING',
        senderName: senderName || null,
        comment: (type === 'ANALYSIS' && pgn) ? `PGN: ${pgn}\n\n${comment || ''}` : (comment || null),
        paymentMethod: paymentMethod || 'sbp'
      },
      include: { user: true, course: true, module: true }
    })

    return NextResponse.json({ success: true, purchase })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
