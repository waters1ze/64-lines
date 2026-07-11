import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clear existing data
  await prisma.purchase.deleteMany()
  await prisma.homework.deleteMany()
  await prisma.course.deleteMany()
  await prisma.inviteLink.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('password123', 10)

  // 1. Create Teacher (Алексей Карпов)
  const teacher = await prisma.user.create({
    data: {
      name: 'Алексей Карпов',
      email: 'teacher@64lines.com',
      passwordHash,
      role: 'TEACHER',
      rating: 2200,
    },
  })
  console.log('Created teacher:', teacher.name)

  // 2. Create Students linked to Teacher
  const student1 = await prisma.user.create({
    data: {
      name: 'Михаил Орлов',
      email: 'student@64lines.com',
      passwordHash,
      role: 'STUDENT',
      rating: 1842,
      teacherId: teacher.id,
    },
  })
  const student2 = await prisma.user.create({
    data: {
      name: 'Анна Волкова',
      email: 'anna@64lines.com',
      passwordHash,
      role: 'STUDENT',
      rating: 1714,
      teacherId: teacher.id,
    },
  })
  console.log('Created students:', student1.name, ',', student2.name)

  // 3. Create Courses
  const course1 = await prisma.course.create({
    data: {
      name: 'Сицилианская защита: полный репертуар',
      description: 'Изучите все основные линии: дракон, найдорф, шевенинген. 32 PGN-файла с анализом.',
      price: 4900,
      imageUrl: '',
    },
  })
  const course2 = await prisma.course.create({
    data: {
      name: 'Испанская партия за белых',
      description: 'Классический дебют. Главные линии, ловушки и типичные планы за белых.',
      price: 3900,
      imageUrl: '',
    },
  })
  console.log('Created courses:', course1.name, ',', course2.name)

  // 4. Create Homeworks
  const hw1 = await prisma.homework.create({
    data: {
      title: 'Тактика: отвлечение защитника',
      pgn: `[Event "Домашнее задание"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5`,
      studentId: student1.id,
      progress: 40,
      solved: false,
      attempts: 1,
    },
  })
  const hw2 = await prisma.homework.create({
    data: {
      title: 'Ладейный эндшпиль: активный король',
      pgn: `[Event "Домашнее задание"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5`,
      studentId: student1.id,
      progress: 100,
      solved: true,
      attempts: 2,
    },
  })
  console.log('Created homeworks:', hw1.title, ',', hw2.title)

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
