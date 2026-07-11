import { TeacherHub } from '@/components/teacher-hub'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { db } from '@/lib/db'

export default async function Page() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const isTeacher = session.user.role === 'TEACHER' || session.user.role === 'ADMIN'

  // Fetch students
  let students = []
  if (isTeacher) {
    students = await db.user.findMany({
      where: { teacherId: session.user.id },
      select: { id: true, name: true, rating: true, email: true }
    })
  }

  // Fetch homeworks
  const homeworksRaw = await db.homework.findMany({
    where: isTeacher
      ? { student: { teacherId: session.user.id } }
      : { studentId: session.user.id }
  })

  // Format homeworks for client
  const homeworks = homeworksRaw.map(hw => ({
    ...hw,
    assignedAt: hw.assignedAt.toISOString(),
    dueDate: hw.dueDate ? hw.dueDate.toISOString() : null
  }))

  return (
    <TeacherHub 
      initialRole={isTeacher ? 'Учитель' : 'Ученик'} 
      userName={session.user.name} 
      initialStudents={students}
      initialHomeworks={homeworks}
    />
  )
}
