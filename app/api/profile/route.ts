import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { db } from "@/lib/db"

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const body = await req.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: "Имя не может быть пустым" }, { status: 400 })
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { name }
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
