const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { contains: 'perekatnov', mode: 'insensitive' } }
  });
  console.log(users.map(u => u.email));
}

main().catch(console.error).finally(() => prisma.$disconnect());
