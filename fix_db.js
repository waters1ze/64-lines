const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Reset everyone to STUDENT and isPremium = false
  await prisma.user.updateMany({
    data: { role: 'STUDENT', isPremium: false }
  });

  // 2. Make Вова Долгих and Кирилл Перекатнов ADMINs
  const admins = await prisma.user.updateMany({
    where: {
      name: {
        in: ['Вова Долгих', 'Кирилл Перекатнов']
      }
    },
    data: { role: 'ADMIN' }
  });

  // 3. Give Premium to Кирилл Перекатнов
  const premium = await prisma.user.updateMany({
    where: {
      name: 'Кирилл Перекатнов'
    },
    data: { isPremium: true }
  });

  console.log('Fixed users.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
