import { db } from '@/lib/db'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export async function generateMetadata({ params }: { params: { userId: string } }): Promise<Metadata> {
  const user = await db.user.findUnique({ where: { id: params.userId } })
  if (!user) return { title: 'Пользователь не найден' }

  return {
    title: `Профиль: ${user.name || 'Аноним'} | 64 Lines`,
    description: `Рейтинг: ${user.rating}. Посмотрите шахматный профиль на 64 Lines.`,
    openGraph: {
      title: `Шахматный профиль: ${user.name || 'Аноним'}`,
      description: `Рейтинг: ${user.rating}. Присоединяйтесь к 64 Lines!`,
      images: ['/chess-avatar.jpg'],
    }
  }
}

export default async function ProfilePage({ params }: { params: { userId: string } }) {
  const user = await db.user.findUnique({ where: { id: params.userId } })
  if (!user) return notFound()

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center py-20 px-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center border">
        <div className="size-24 rounded-full bg-amber-100 text-amber-600 text-3xl flex items-center justify-center mx-auto mb-4 font-bold">
          {(user.name || 'A')[0].toUpperCase()}
        </div>
        <h1 className="text-3xl font-bold mb-2">{user.name || 'Аноним'}</h1>
        <p className="text-muted-foreground mb-6">Рейтинг: {user.rating}</p>

        <div className="bg-muted/30 p-4 rounded-xl border flex flex-col gap-2">
          <p className="text-sm font-semibold text-left">Статистика</p>
          <div className="flex justify-between text-sm">
            <span>Решено задач (сегодня):</span>
            <span className="font-semibold">{user.puzzlesSolvedToday || 0}</span>
          </div>
        </div>

        <div className="mt-8">
          <Link href="/login" className="button w-full justify-center">Бросить вызов / Добавить в друзья</Link>
        </div>
      </div>
    </div>
  )
}
