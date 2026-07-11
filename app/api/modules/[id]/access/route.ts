import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { db } from '@/lib/db'

// GET: list all users with access to this module
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (role !== 'TEACHER' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const accesses = await db.moduleAccess.findMany({
    where: { moduleId: id },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
  return NextResponse.json(accesses)
}

// POST: grant access to a student
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (role !== 'TEACHER' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const { userId } = await req.json()
  const access = await db.moduleAccess.upsert({
    where: { userId_moduleId: { userId, moduleId: id } },
    update: {},
    create: { userId, moduleId: id },
  })
  return NextResponse.json(access)
}

// DELETE: revoke access from a student
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (role !== 'TEACHER' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const { userId } = await req.json()
  await db.moduleAccess.delete({ where: { userId_moduleId: { userId, moduleId: id } } })
  return NextResponse.json({ ok: true })
}
