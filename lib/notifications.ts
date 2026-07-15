import { db } from './db'
import { sendPushToUser } from './push'

interface BroadcastOptions {
  title: string
  message: string
  link?: string
  excludeUserId?: string
}

export async function broadcastNotification({ title, message, link = '/', excludeUserId }: BroadcastOptions) {
  try {
    // Find all STUDENT users (and optionally TEACHER) to notify
    const users = await db.user.findMany({
      where: {
        role: { in: ['STUDENT', 'TEACHER', 'ADMIN'] },
        ...(excludeUserId ? { id: { not: excludeUserId } } : {})
      },
      select: { id: true }
    })

    if (users.length === 0) return

    // Create all notifications in one batch query
    await db.notification.createMany({
      data: users.map(u => ({
        userId: u.id,
        title,
        message,
        link,
        isRead: false
      }))
    })

    // Send push notifications (fire-and-forget, non-blocking)
    for (const user of users) {
      sendPushToUser(user.id, { title, body: message, url: link }).catch(() => {})
    }
  } catch (error) {
    console.error('broadcastNotification error:', error)
  }
}
