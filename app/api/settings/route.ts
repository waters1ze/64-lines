import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function GET() {
  try {
    let settings = await db.settings.findUnique({ where: { id: 'global' } })
    if (!settings) {
      settings = await db.settings.create({
        data: { id: 'global', subscriptionPrice: 300, analysisPrice: 70 }
      })
    }
    return NextResponse.json(settings)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await req.json()
    
    const settings = await db.settings.upsert({
      where: { id: 'global' },
      update: {
        subscriptionPrice: body.subscriptionPrice !== undefined ? Number(body.subscriptionPrice) : undefined,
        analysisPrice: body.analysisPrice !== undefined ? Number(body.analysisPrice) : undefined,
      },
      create: {
        id: 'global',
        subscriptionPrice: body.subscriptionPrice !== undefined ? Number(body.subscriptionPrice) : 300,
        analysisPrice: body.analysisPrice !== undefined ? Number(body.analysisPrice) : 70
      }
    })
    
    return NextResponse.json(settings)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
