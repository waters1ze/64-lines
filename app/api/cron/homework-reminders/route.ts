import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendHomeworkDeadlineReminder } from '@/lib/mail'

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Find unresolved homeworks with due dates in the next 24 hours
    const pendingHomeworks = await db.homework.findMany({
      where: {
        solved: false,
        dueDate: {
          gte: now,
          lte: in24Hours
        }
      },
      include: {
        student: { select: { email: true } }
      }
    })

    // Filter in-memory: reminderSentAt is null or reminderSentAt < dueDate - 24 hours
    const toRemind = pendingHomeworks.filter((hw) => {
      if (!hw.dueDate) return false
      if (!hw.reminderSentAt) return true
      const threshold = new Date(hw.dueDate.getTime() - 24 * 60 * 60 * 1000)
      return hw.reminderSentAt < threshold
    })

    let sentCount = 0
    for (const hw of toRemind) {
      if (hw.student.email) {
        try {
          await sendHomeworkDeadlineReminder(hw.student.email, hw.title, hw.dueDate!)
          await db.homework.update({
            where: { id: hw.id },
            data: { reminderSentAt: now }
          })
          sentCount++
        } catch (err) {
          console.error(`Failed to send reminder email for homework ${hw.id}:`, err)
        }
      }
    }

    return NextResponse.json({ success: true, sentCount })
  } catch (error) {
    console.error('Homework reminders cron error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
