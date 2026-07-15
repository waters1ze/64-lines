import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'
import { sendPushToUser } from '@/lib/push'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (session.user.role === 'TEACHER' || session.user.role === 'ADMIN') {
      const requests = await db.gameAnalysisRequest.findMany({
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json(requests)
    } else {
      const user = await db.user.findUnique({ where: { email: session.user.email } })
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

      const requests = await db.gameAnalysisRequest.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json(requests)
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await req.json()
    const { id, title, answerPgn, answerVideo, teacherComment, status } = body
    
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    
    const reqData = await db.gameAnalysisRequest.findUnique({ where: { id: String(id) } })
    if (!reqData) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    const updated = await db.gameAnalysisRequest.update({
      where: { id: String(id) },
      data: {
        ...(title !== undefined && { title }),
        ...(answerPgn !== undefined && { answerPgn }),
        ...(answerVideo !== undefined && { answerVideo }),
        ...(teacherComment !== undefined && { teacherComment }),
        ...(status !== undefined && { status })
      }
    })
    
    if (status === 'COMPLETED' && reqData.status !== 'COMPLETED') {
      await db.notification.create({
        data: {
          userId: reqData.userId,
          title: 'Разбор партии готов!',
          message: `Тренер разобрал вашу партию: ${title || 'Без названия'}. Вы можете посмотреть разбор в разделе "Мои курсы".`,
          link: '#modules'
        }
      })

      await sendPushToUser(reqData.userId, {
        title: 'Разбор партии готов!',
        body: `Тренер разобрал вашу партию: ${title || 'Без названия'}.`,
        url: '/?section=courses' // or similar link
      }).catch((e) => console.error('Analysis push notify error:', e))
    }
    
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
