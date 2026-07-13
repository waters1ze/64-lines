import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teachers = await db.user.findMany({
    where: { role: { in: ['TEACHER', 'ADMIN'] } },
    select: { id: true, name: true, email: true, role: true }
  })

  return NextResponse.json(teachers)
}
