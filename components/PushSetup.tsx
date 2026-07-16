'use client'

import { useEffect } from 'react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushSetup() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      return
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      console.warn('VAPID public key not set in environment variables')
      return
    }

    const registerAndSubscribe = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        
        let permission = Notification.permission
        if (permission === 'default') {
          permission = await Notification.requestPermission()
        }

        if (permission !== 'granted') {
          return
        }

        // Wait until service worker is active
        if (registration.installing) {
          await new Promise<void>((resolve) => {
            registration.installing?.addEventListener('statechange', (e) => {
              if ((e.target as any).state === 'activated') {
                resolve()
              }
            })
          })
        }

        let subscription = await registration.pushManager.getSubscription()
        
        try {
          if (!subscription) {
             subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidKey)
            })
          }
        } catch (err: any) {
          if (err.name === 'InvalidStateError' || err.message.includes('A subscription with a different applicationServerKey')) {
            if (subscription) {
              await subscription.unsubscribe()
            }
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidKey)
            })
          } else {
            throw err
          }
        }

        if (subscription) {
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription)
          })
        }
      } catch (e) {
        console.error('Error during Web Push registration:', e)
      }
    }

    registerAndSubscribe()
  }, [])

  return null
}
