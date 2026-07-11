import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined

  const modules = await db.module.findMany({
    orderBy: { order: 'asc' },
    include: {
      lessons: { orderBy: { order: 'asc' } },
      accesses: userId ? { where: { userId } } : false,
    },
  })

  // Attach hasAccess flag per module
  const result = modules.map(m => ({
    ...m,
    hasAccess: userId
      ? m.visibility === 'ALL' ||
        (m.accesses as any[]).some((a: any) => a.userId === userId)
      : m.visibility === 'ALL',
    accesses: undefined,
  }))

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (role !== 'TEACHER' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const module = await db.module.create({
    data: {
      title: body.title,
      description: body.description ?? '',
      tags: body.tags ?? [],
      visibility: body.visibility ?? 'ALL',
      price: body.price ?? 0,
      order: body.order ?? 0,
    },
    include: { lessons: true },
  })
  return NextResponse.json(module)
}
