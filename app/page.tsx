import { TeacherHub } from '@/components/teacher-hub'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { db } from '@/lib/db'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

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

  let dbUserRole = 'STUDENT'
  let userRating = 1200
  let userName = 'Гость'
  let isPremium = false
  if (session?.user?.email) {
    const dbUser = await db.user.findUnique({ where: { email: session.user.email } })
    if (dbUser) {
      userRating = dbUser.rating
      userName = dbUser.name || session.user.name || 'Гость'
      dbUserRole = dbUser.role
      isPremium = dbUser.isPremium
      
      // Override session with database data to prevent stale JWT session issues
      session.user.id = dbUser.id
      
      isTeacher = dbUser.role === 'TEACHER' || dbUser.role === 'ADMIN'
      isStudent = dbUser.role === 'STUDENT'
    } else {
      // If user not in DB anymore, force logout
      return redirect('/api/auth/signout')
    }
  }

  // Fetch data
  const courses = await db.course.findMany({ orderBy: { createdAt: 'desc' } })
  const videos = await db.video.findMany({ orderBy: { createdAt: 'desc' } })
  const openings = await db.opening.findMany({ orderBy: { createdAt: 'desc' } })

  let students: any[] = []
  let homeworksRaw: any[] = []
  let purchasesRaw: any[] = []

  if (isTeacher && session) {
    // Auto cleanup expired homeworks
    await db.homework.deleteMany({
      where: { dueDate: { lt: new Date() } }
    })
    
    students = await db.user.findMany({
      where: { teacherId: session.user.id },
      select: { id: true, name: true, rating: true, email: true }
    })
    homeworksRaw = await db.homework.findMany({
      where: { student: { teacherId: session.user.id } }
    })
    purchasesRaw = await db.purchase.findMany({
      include: { user: true, course: true, module: true },
      orderBy: { createdAt: 'desc' }
    })
  } else if (isStudent && session) {
    // Auto cleanup expired homeworks
    await db.homework.deleteMany({
      where: { dueDate: { lt: new Date() } }
    })
    
    homeworksRaw = await db.homework.findMany({
      where: { studentId: session.user.id }
    })
    purchasesRaw = await db.purchase.findMany({
      where: { userId: session.user.id },
      include: { course: true, module: true }
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
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Загрузка...</div>}>
      <TeacherHub 
        initialRole={
          dbUserRole === 'ADMIN' ? 'ADMIN' :
          isTeacher ? 'Учитель' : 
          isStudent ? 'Ученик' : 'Гость'
        }
        userName={userName} 
        userRating={userRating}
        isPremium={isPremium}
        initialStudents={students}
        initialHomeworks={homeworks}
        initialCourses={courses}
        initialVideos={videos}
        initialOpenings={openings}
        initialPurchases={purchases}
      />
    </Suspense>
  )
}

