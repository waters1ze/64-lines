import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const lessons = await db.lesson.findMany({
    where: { moduleId: id },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(lessons)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (role !== 'TEACHER' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()

  // Get current max order
  const last = await db.lesson.findFirst({ where: { moduleId: id }, orderBy: { order: 'desc' } })
  const order = (last?.order ?? 0) + 1

  const lesson = await db.lesson.create({
    data: {
      title: body.title,
      videoUrl: body.videoUrl ?? null,
      fileUrl: body.fileUrl ?? null,
      order,
      moduleId: id,
    },
  })
  return NextResponse.json(lesson)
}
