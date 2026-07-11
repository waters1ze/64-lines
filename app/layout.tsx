import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin', 'cyrillic'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin', 'cyrillic'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: '64 Lines — Личный кабинет ученика',
  description: 'Личный шахматный хаб: ваши задания, тренировки и уроки.',
  generator: 'v0.app',
  keywords: ['шахматы', 'обучение шахматам', 'шахматная школа', 'тренер по шахматам', 'шахматы для детей', 'онлайн шахматы', '64 линии'],
  verification: {
    google: 'google6fffdecb7dae406a',
  }
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
