import webpush from 'web-push'
import { db } from './db'

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@64-lines.ru'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  )
} else {
  console.warn('Web Push VAPID keys not configured in environment variables.')
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('Cannot send push: VAPID keys not configured')
    return
  }

  try {
    const subscriptions = await db.pushSubscription.findMany({
      where: { userId }
    })

    if (subscriptions.length === 0) return

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          JSON.stringify(payload)
        )
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`Removing expired subscription: ${sub.id}`)
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        } else {
          console.error(`Error sending push notification to sub ${sub.id}:`, error)
        }
      }
    })

    await Promise.all(sendPromises)
  } catch (error) {
    console.error('sendPushToUser error:', error)
  }
}
