import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // "OPENING" | "VIDEO"
    
    if (!type || (type !== 'OPENING' && type !== 'VIDEO')) {
      return new NextResponse('Invalid type parameter', { status: 400 })
    }

    const categories = await db.category.findMany({
      where: { type },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Categories GET error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (user?.role !== 'ADMIN' && user?.role !== 'TEACHER') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { name, type } = await req.json()
    if (!name || !type) return new NextResponse('Bad Request', { status: 400 })

    const category = await db.category.create({
      data: { name, type }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Categories POST error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
