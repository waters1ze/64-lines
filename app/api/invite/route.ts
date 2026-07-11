import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { db } from "@/lib/db"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Только администраторы или учителя могут создавать приглашения
    if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 })
    }

    const body = await req.json()
    const { role = 'STUDENT' } = body

    const token = crypto.randomBytes(32).toString('hex')

    const invite = await db.inviteLink.create({
      data: {
        token,
        role,
        teacherId: session.user.id
      }
    })

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${invite.token}`

    return NextResponse.json({ url: inviteUrl })
  } catch (error) {
    console.error("Invite error:", error)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
