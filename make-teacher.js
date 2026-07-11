const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  
  if (!email) {
    console.log('Пожалуйста, укажите email пользователя. Пример: node make-teacher.js myemail@gmail.com')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.log(`Пользователь с email ${email} не найден. Сначала зарегистрируйтесь на сайте.`)
    process.exit(1)
  }

  await prisma.user.update({
    where: { email },
    data: { role: 'TEACHER' }
  })

  console.log(`✅ Пользователь ${email} успешно назначен учителем!`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
