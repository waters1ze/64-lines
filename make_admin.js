const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    data: { role: 'ADMIN', isPremium: true }
  });
  console.log('Updated ' + result.count + ' users to ADMIN and PREMIUM');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
