import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getWeakThemesRecommendation } from '@/lib/groq'

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teacher = await db.user.findUnique({ where: { email: session.user.email } })
  if (!teacher) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const invite = await db.teacherStudentInvite.findFirst({
    where: { teacherId: teacher.id, studentId: studentId, status: 'ACCEPTED' }
  })
  if (!invite) return NextResponse.json({ error: 'Not your student' }, { status: 403 })

  const report = await db.studentWeakThemesReport.findFirst({
    where: { studentId: params.studentId, teacherId: teacher.id },
    orderBy: { generatedAt: 'desc' }
  })

  return NextResponse.json({ report })
}

export async function POST(req: Request, { params }: { params: { studentId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teacher = await db.user.findUnique({ where: { email: session.user.email } })
  if (!teacher) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const invite = await db.teacherStudentInvite.findFirst({
    where: { teacherId: teacher.id, studentId: params.studentId, status: 'ACCEPTED' }
  })
  if (!invite) return NextResponse.json({ error: 'Not your student' }, { status: 403 })

  const student = await db.user.findUnique({ where: { id: params.studentId } })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const missed = await db.missedPuzzle.findMany({
    where: { userId: params.studentId }
  })

  if (missed.length === 0) {
    return NextResponse.json({ error: 'Ученик еще не совершал ошибок в задачах.' }, { status: 400 })
  }

  const themesCount: Record<string, number> = {}
  for (const m of missed) {
    if (!m.themes) continue
    const ths = m.themes.split(' ')
    for (const t of ths) {
      if (t) themesCount[t] = (themesCount[t] || 0) + 1
    }
  }

  if (Object.keys(themesCount).length === 0) {
    return NextResponse.json({ error: 'Нет данных по темам.' }, { status: 400 })
  }

  const recommendation = await getWeakThemesRecommendation(themesCount, student.name || 'Ученик')

  const report = await db.studentWeakThemesReport.create({
    data: {
      studentId: student.id,
      teacherId: teacher.id,
      themesJson: JSON.stringify(themesCount),
      recommendation
    }
  })

  return NextResponse.json({ report })
}
