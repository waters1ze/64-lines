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
  let puzzlesSolvedTotal = 0
  let puzzlesAttempted = 0
  let activityStreak = 0
  let userRank = 0
  let premiumUntil: Date | null = null
  let premiumSource: string | null = null
  let seasonRating = 1500
  
  if (session?.user?.email) {
    const dbUser = await db.user.findUnique({ where: { email: session.user.email } })
    if (dbUser) {
      userRating = dbUser.rating
      userName = dbUser.name || session.user.name || 'Гость'
      dbUserRole = dbUser.role
      isPremium = dbUser.isPremium
      puzzlesSolvedTotal = dbUser.puzzlesSolvedTotal
      puzzlesAttempted = dbUser.puzzlesAttempted
      activityStreak = dbUser.activityStreak
      userRank = await db.user.count({ where: { rating: { gt: dbUser.rating } } }) + 1
      
      if (isPremium && dbUser.premiumUntil && dbUser.premiumUntil < new Date()) {
        await db.user.update({ where: { id: dbUser.id }, data: { isPremium: false, premiumUntil: null, premiumSource: null } })
        isPremium = false
      } else if (isPremium) {
        premiumUntil = dbUser.premiumUntil
        premiumSource = dbUser.premiumSource
      }
      
      seasonRating = dbUser.seasonRating
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
  const categories = await db.category.findMany({ orderBy: { createdAt: 'asc' } })

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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'itemListElement': courses.map((course, idx) => ({
      '@type': 'ListItem',
      'position': idx + 1,
      'item': {
        '@type': 'Course',
        'name': course.name,
        'description': course.description,
        'provider': {
          '@type': 'Organization',
          'name': '64 Lines',
          'url': 'https://64-lines.ru'
        },
        'offers': {
          '@type': 'Offer',
          'price': course.price,
          'priceCurrency': 'RUB',
          'availability': 'https://schema.org/InStock'
        }
      }
    }))
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Загрузка...</div>}>
      {/* TODO: Для более точных rich-результатов в будущем рекомендуется создать отдельные SSR-страницы /courses/[id] с индивидуальным JSON-LD на каждую */}
      {isGuest && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <TeacherHub 
        initialRole={
          dbUserRole === 'ADMIN' ? 'ADMIN' :
          isTeacher ? 'Учитель' : 
          isStudent ? 'Ученик' : 'Гость'
        }
        userName={userName} 
        userRating={userRating}
        userRank={userRank}
        isPremium={isPremium}
        premiumUntil={premiumUntil}
        premiumSource={premiumSource}
        seasonRating={seasonRating}
        puzzlesSolvedTotal={puzzlesSolvedTotal}
        puzzlesAttempted={puzzlesAttempted}
        activityStreak={activityStreak}
        initialStudents={students}
        initialHomeworks={homeworks}
        initialCourses={courses}
        initialVideos={videos}
        initialOpenings={openings}
        initialPurchases={purchases}
        initialCategories={categories}
      />
    </Suspense>
  )
}

