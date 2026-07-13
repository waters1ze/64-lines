import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { db } from '@/lib/db'

// GET: получить входящие/исходящие приглашения для текущего пользователя
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })
    const me = await db.user.findUnique({ where: { email: session.user.email } })
    if (!me) return new NextResponse('Not found', { status: 404 })

    if (me.role === 'TEACHER' || me.role === 'ADMIN') {
      // Учитель видит: входящие запросы от учеников (STUDENT_REQUESTED) + свои исходящие (TEACHER_INVITED)
      const invites = await db.teacherStudentInvite.findMany({
        where: { teacherId: me.id, status: 'PENDING' },
        include: {
          student: { select: { id: true, name: true, email: true, rating: true, teacherId: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json(invites)
    } else {
      // Ученик видит свои запросы и входящие от учителей
      const invites = await db.teacherStudentInvite.findMany({
        where: { studentId: me.id, status: 'PENDING' },
        include: {
          teacher: { select: { id: true, name: true, email: true, rating: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json(invites)
    }
  } catch (e) {
    console.error('Invites GET error:', e)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

// POST: создать приглашение/запрос
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })
    const me = await db.user.findUnique({ where: { email: session.user.email } })
    if (!me) return new NextResponse('Not found', { status: 404 })

    const { targetId } = await req.json()
    if (!targetId) return new NextResponse('Bad Request', { status: 400 })

    if (me.role === 'TEACHER' || me.role === 'ADMIN') {
      // Учитель приглашает ученика
      const student = await db.user.findUnique({ where: { id: targetId } })
      if (!student || student.role !== 'STUDENT') return new NextResponse('Target must be a student', { status: 400 })
      if (student.teacherId) return NextResponse.json({ error: 'У этого ученика уже есть учитель' }, { status: 400 })

      // Проверяем нет ли уже активного приглашения
      const existing = await db.teacherStudentInvite.findUnique({
        where: { teacherId_studentId: { teacherId: me.id, studentId: targetId } }
      })
      if (existing) {
        if (existing.status === 'PENDING') return NextResponse.json({ error: 'Приглашение уже отправлено' }, { status: 400 })
        // Если REJECTED — можно перезаписать
        await db.teacherStudentInvite.delete({ where: { id: existing.id } })
      }

      const invite = await db.teacherStudentInvite.create({
        data: { teacherId: me.id, studentId: targetId, direction: 'TEACHER_INVITED' }
      })
      return NextResponse.json(invite)
    } else {
      // Ученик просится к учителю
      if (me.teacherId) return NextResponse.json({ error: 'У вас уже есть учитель' }, { status: 400 })

      const teacher = await db.user.findUnique({ where: { id: targetId } })
      if (!teacher || (teacher.role !== 'TEACHER' && teacher.role !== 'ADMIN')) {
        return new NextResponse('Target must be a teacher', { status: 400 })
      }

      const existing = await db.teacherStudentInvite.findUnique({
        where: { teacherId_studentId: { teacherId: targetId, studentId: me.id } }
      })
      if (existing) {
        if (existing.status === 'PENDING') return NextResponse.json({ error: 'Запрос уже отправлен' }, { status: 400 })
        await db.teacherStudentInvite.delete({ where: { id: existing.id } })
      }

      const invite = await db.teacherStudentInvite.create({
        data: { teacherId: targetId, studentId: me.id, direction: 'STUDENT_REQUESTED' }
      })
      return NextResponse.json(invite)
    }
  } catch (e) {
    console.error('Invites POST error:', e)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

// PUT: принять/отклонить приглашение
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })
    const me = await db.user.findUnique({ where: { email: session.user.email } })
    if (!me) return new NextResponse('Not found', { status: 404 })

    const { inviteId, action } = await req.json() // action: 'ACCEPT' | 'REJECT'
    if (!inviteId || !['ACCEPT', 'REJECT'].includes(action)) return new NextResponse('Bad Request', { status: 400 })

    const invite = await db.teacherStudentInvite.findUnique({ where: { id: inviteId } })
    if (!invite) return new NextResponse('Not found', { status: 404 })

    // Проверяем право: принять может та сторона, которой направлено приглашение
    const canAct = 
      (invite.direction === 'TEACHER_INVITED' && invite.studentId === me.id) ||
      (invite.direction === 'STUDENT_REQUESTED' && invite.teacherId === me.id)
    
    if (!canAct) return new NextResponse('Forbidden', { status: 403 })

    if (action === 'ACCEPT') {
      // Проверяем ещё раз, что у ученика нет учителя
      const student = await db.user.findUnique({ where: { id: invite.studentId } })
      if (student?.teacherId) {
        await db.teacherStudentInvite.delete({ where: { id: inviteId } })
        return NextResponse.json({ error: 'У ученика уже есть учитель' }, { status: 400 })
      }

      // Привязываем ученика к учителю
      await db.user.update({ where: { id: invite.studentId }, data: { teacherId: invite.teacherId } })
      // Удаляем приглашение
      await db.teacherStudentInvite.delete({ where: { id: inviteId } })
      // Удаляем все остальные pending приглашения этого ученика
      await db.teacherStudentInvite.deleteMany({ where: { studentId: invite.studentId, status: 'PENDING' } })
      return NextResponse.json({ success: true, action: 'ACCEPTED' })
    } else {
      await db.teacherStudentInvite.update({ where: { id: inviteId }, data: { status: 'REJECTED' } })
      return NextResponse.json({ success: true, action: 'REJECTED' })
    }
  } catch (e) {
    console.error('Invites PUT error:', e)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

// DELETE: отозвать своё приглашение
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })
    const me = await db.user.findUnique({ where: { email: session.user.email } })
    if (!me) return new NextResponse('Not found', { status: 404 })

    const { inviteId } = await req.json()
    if (!inviteId) return new NextResponse('Bad Request', { status: 400 })

    const invite = await db.teacherStudentInvite.findUnique({ where: { id: inviteId } })
    if (!invite) return new NextResponse('Not found', { status: 404 })

    const canDelete = invite.teacherId === me.id || invite.studentId === me.id
    if (!canDelete) return new NextResponse('Forbidden', { status: 403 })

    await db.teacherStudentInvite.delete({ where: { id: inviteId } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Invites DELETE error:', e)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
