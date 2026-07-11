import { TeacherHub } from '@/components/teacher-hub'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"

export default async function Page() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  // Pass session data to the client component.
  // We can pass the role to TeacherHub so it knows whether to render teacher or student view.
  return <TeacherHub initialRole={session.user.role === 'TEACHER' ? 'Учитель' : 'Ученик'} userName={session.user.name} />
}
