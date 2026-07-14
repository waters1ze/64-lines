import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const requests = await db.gameAnalysisRequest.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(requests)
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
    const { id, answerPgn, answerVideo, status } = body
    
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    
    const updated = await db.gameAnalysisRequest.update({
      where: { id: String(id) },
      data: {
        ...(answerPgn !== undefined && { answerPgn }),
        ...(answerVideo !== undefined && { answerVideo }),
        ...(status !== undefined && { status })
      }
    })
    
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
