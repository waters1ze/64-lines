import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (role !== 'TEACHER' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const lesson = await db.lesson.update({
    where: { id },
    data: {
      title: body.title,
      videoUrl: body.videoUrl ?? null,
      fileUrl: body.fileUrl ?? null,
      order: body.order,
    },
  })
  return NextResponse.json(lesson)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (role !== 'TEACHER' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  await db.lesson.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
