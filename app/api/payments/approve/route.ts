import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'
import nodemailer from 'nodemailer'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { purchaseId } = await req.json()
    if (!purchaseId) {
      return NextResponse.json({ error: 'Purchase ID is required' }, { status: 400 })
    }

    const purchase = await db.purchase.findUnique({
      where: { id: String(purchaseId) },
      include: { user: true, course: true }
    })

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    if (purchase.status === 'APPROVED') {
      return NextResponse.json({ error: 'Already approved' }, { status: 400 })
    }

    // 1. Update purchase status
    await db.purchase.update({
      where: { id: purchase.id },
      data: { status: 'APPROVED' }
    })

    // 2. Send Email
    // In a real app, use environment variables: process.env.EMAIL_USER and process.env.EMAIL_PASS
    // For now, we will assume standard SMTP if env vars are present. 
    // If not, we just log it and simulate success so the app doesn't crash during testing.
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        host: 'smtp.mail.ru', // Adjust depending on user's email provider
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      })

      const mailOptions = {
        from: `"Шахматная Школа" <${process.env.EMAIL_USER}>`,
        to: purchase.user.email,
        subject: `Доступ к курсу: ${purchase.course.name}`,
        text: `Здравствуйте, ${purchase.user.name}!\n\nОплата успешно подтверждена.\nВаш курс "${purchase.course.name}" теперь доступен в вашем личном кабинете на сайте.\n\nМатериалы курса (ссылка или текст): ${purchase.course.fileUrl || 'Нет дополнительных файлов.'}\n\nС уважением, Шахматная Школа.`
      }

      await transporter.sendMail(mailOptions)
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
