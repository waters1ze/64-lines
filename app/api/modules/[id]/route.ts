import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const module = await db.module.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      tags: body.tags,
      visibility: body.visibility,
      price: body.price,
      order: body.order,
    },
    include: { lessons: { orderBy: { order: 'asc' } } },
  })
  return NextResponse.json(module)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  await db.module.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
