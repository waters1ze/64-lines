import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token")

    if (!token) {
      return NextResponse.redirect(new URL("/login?error=Неверная ссылка", req.url))
    }

    const user = await db.user.findFirst({
      where: { verificationToken: token }
    })

    if (!user) {
      return NextResponse.redirect(new URL("/login?error=Ссылка устарела или недействительна", req.url))
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verificationToken: null
      }
    })

    return NextResponse.redirect(new URL("/login?verified=true", req.url))
  } catch (error) {
    console.error("Verification error:", error)
    return NextResponse.redirect(new URL("/login?error=Внутренняя ошибка", req.url))
  }
}
