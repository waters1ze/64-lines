import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (user?.role !== 'TEACHER' && user?.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { name, description, price, imageUrl, fileUrl, pgn } = await req.json()

    const course = await db.course.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(fileUrl !== undefined && { fileUrl }),
        ...(pgn !== undefined && { pgn }),
      }
    })

    return NextResponse.json(course)
  } catch (error) {
    console.error('Course update error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (user?.role !== 'TEACHER' && user?.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    await db.course.delete({
      where: { id }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Course DELETE error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
