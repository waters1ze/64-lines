import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'teacher@64lines.ru' // Замените на нужный email
  const password = 'password123'     // Замените на нужный пароль

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    console.log(`Пользователь ${email} уже существует.`)
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      name: 'Алексей Тренер',
      email: email,
      passwordHash: passwordHash,
      role: 'TEACHER',
      rating: 2200,
    },
  })

  console.log('Создан первый учитель:', user)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
