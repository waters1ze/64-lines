import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin', 'cyrillic'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin', 'cyrillic'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: '64 Lines — Шахматная школа | Личный кабинет',
  description: '64 Lines (64 клетки) — современная шахматная школа онлайн. Ваш личный шахматный хаб: задания, тренировки, дебютные курсы и уроки от тренера.',
  generator: 'v0.app',
  keywords: ['64 lines', '64-lines', '64 клетки', 'шахматы 64', 'шахматы', 'обучение шахматам', 'шахматная школа', 'тренер по шахматам', 'шахматы для детей', 'онлайн шахматы', '64 линии'],
  verification: {
    google: 'google6fffdecb7dae406a',
  },
  manifest: '/manifest.json'
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
}

import { Providers } from '@/components/providers'

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`bg-background ${geist.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <Providers>
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </Providers>
      </body>
    </html>
  )
}
