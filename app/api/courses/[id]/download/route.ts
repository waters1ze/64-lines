import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Checking Premium and Premium Source
    const hasActivePremium = user.isPremium && user.premiumUntil && user.premiumUntil > new Date()
    const canDownload = hasActivePremium && user.premiumSource === "PAID"

    if (!canDownload) {
      return NextResponse.json(
        { error: 'Скачивание PGN доступно только с платной Premium-подпиской.' }, 
        { status: 403 }
      )
    }

    const resolvedParams = await params
    const id = resolvedParams.id

    const course = await db.course.findUnique({
      where: { id }
    })

    if (!course || !course.pgn) {
      return NextResponse.json({ error: 'Курс или PGN не найден' }, { status: 404 })
    }

    return new NextResponse(course.pgn, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-chess-pgn;charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(course.name)}.pgn"`
      }
    })

  } catch (error) {
    console.error('Error downloading PGN:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
