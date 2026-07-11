import { TeacherHub } from '@/components/teacher-hub'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { db } from '@/lib/db'

export default async function Page() {
  const session = await getServerSession(authOptions)

  let isTeacher = false
  let isStudent = false
  let isGuest = true

  if (session) {
    isTeacher = session.user.role === 'TEACHER' || session.user.role === 'ADMIN'
    isStudent = session.user.role === 'STUDENT'
    isGuest = false
  }

  // Fetch data
  const courses = await db.course.findMany({ orderBy: { createdAt: 'desc' } })
  const videos = await db.video.findMany({ orderBy: { createdAt: 'desc' } })
  const openings = await db.opening.findMany({ orderBy: { createdAt: 'desc' } })

  let students: any[] = []
  let homeworksRaw: any[] = []
  let purchasesRaw: any[] = []

  if (isTeacher && session) {
    students = await db.user.findMany({
      where: { teacherId: session.user.id },
      select: { id: true, name: true, rating: true, email: true }
    })
    homeworksRaw = await db.homework.findMany({
      where: { student: { teacherId: session.user.id } }
    })
    purchasesRaw = await db.purchase.findMany({
      include: { user: true, course: true },
      orderBy: { createdAt: 'desc' }
    })
  } else if (isStudent && session) {
    homeworksRaw = await db.homework.findMany({
      where: { studentId: session.user.id }
    })
    purchasesRaw = await db.purchase.findMany({
      where: { userId: session.user.id },
      include: { course: true }
    })
  }

  const homeworks = homeworksRaw.map(hw => ({
    ...hw,
    assignedAt: hw.assignedAt.toISOString(),
    dueDate: hw.dueDate ? hw.dueDate.toISOString() : null
  }))

  const purchases = purchasesRaw.map(p => ({
    ...p,
    createdAt: p.createdAt.toISOString()
  }))

  return (
    <TeacherHub 
      initialRole={isTeacher ? 'Учитель' : (isStudent ? 'Ученик' : 'Гость')} 
      userName={session?.user?.name || 'Гость'} 
      initialStudents={students}
      initialHomeworks={homeworks}
      initialCourses={courses}
      initialVideos={videos}
      initialOpenings={openings}
      initialPurchases={purchases}
    />
  )
}

