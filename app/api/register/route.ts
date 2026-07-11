import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, name, email, password } = body

    if (!token || !name || !email || !password) {
      return NextResponse.json({ error: "Пожалуйста, заполните все поля" }, { status: 400 })
    }

    const invite = await db.inviteLink.findUnique({
      where: { token }
    })

    if (!invite || invite.used) {
      return NextResponse.json({ error: "Недействительная или использованная ссылка-приглашение" }, { status: 400 })
    }

    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const verificationToken = crypto.randomUUID()

    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: invite.role,
        teacherId: invite.teacherId,
        verificationToken,
      }
    })

    // Помечаем токен как использованный
    await db.inviteLink.update({
      where: { id: invite.id },
      data: { used: true }
    })
    
    // Отправляем письмо с подтверждением
    const { sendVerificationEmail } = await import("@/lib/mail")
    await sendVerificationEmail(email, verificationToken)

    return NextResponse.json({ success: true, message: "Письмо с подтверждением отправлено" })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
