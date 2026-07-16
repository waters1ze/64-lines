import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getWeakThemesRecommendation, getWeakThemesWithRecommendations } from '@/lib/groq'

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
    where: { studentId, teacherId: teacher.id },
    orderBy: { generatedAt: 'desc' }
  })

  return NextResponse.json({ report })
}

export async function POST(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teacher = await db.user.findUnique({ where: { email: session.user.email } })
  if (!teacher) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const invite = await db.teacherStudentInvite.findFirst({
    where: { teacherId: teacher.id, studentId, status: 'ACCEPTED' }
  })
  if (!invite) return NextResponse.json({ error: 'Not your student' }, { status: 403 })

  const student = await db.user.findUnique({ where: { id: studentId } })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const missed = await db.missedPuzzle.findMany({ where: { userId: studentId } })
  if (missed.length === 0) {
    return NextResponse.json({ error: 'Ученик еще не совершал ошибок в задачах.' }, { status: 400 })
  }

  const themesCount: Record<string, number> = {}
  for (const m of missed) {
    if (!m.themes) continue
    for (const t of m.themes.split(' ')) {
      if (t) themesCount[t] = (themesCount[t] || 0) + 1
    }
  }

  if (Object.keys(themesCount).length === 0) {
    return NextResponse.json({ error: 'Нет данных по темам.' }, { status: 400 })
  }

  // Pre-filter videos and openings by tag intersection with top weak themes
  const topWeakThemes = Object.entries(themesCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([t]) => t)

  const allVideos = await db.video.findMany({ select: { id: true, title: true, tags: true } })
  const allOpenings = await db.opening.findMany({ select: { id: true, title: true, tags: true } })

  const matchedVideos = allVideos
    .filter(v => v.tags && v.tags.split(' ').some(tag => topWeakThemes.includes(tag)))
    .map(v => ({ id: v.id, title: v.title }))

  const matchedOpenings = allOpenings
    .filter(o => o.tags && o.tags.split(' ').some(tag => topWeakThemes.includes(tag)))
    .map(o => ({ id: o.id, title: o.title }))

  const result = await getWeakThemesWithRecommendations(
    themesCount,
    student.name || 'Ученик',
    matchedVideos,
    matchedOpenings
  )

  const report = await db.studentWeakThemesReport.create({
    data: {
      studentId: student.id,
      teacherId: teacher.id,
      themesJson: JSON.stringify(themesCount),
      recommendation: result.recommendation,
      recommendationsJson: JSON.stringify({
        recommendedVideos: result.recommendedVideos,
        recommendedOpenings: result.recommendedOpenings
      })
    }
  })

  return NextResponse.json({ report })
}

