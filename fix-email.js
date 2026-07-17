const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { equals: 'illperekatnov13@gmail.com', mode: 'insensitive' } }
  });
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { email: 'kirillperekatnov13@gmail.com' }
    });
    console.log('User email updated');
  } else {
    console.log('User not found');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
