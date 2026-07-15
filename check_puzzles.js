const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.puzzle.findFirst();
  console.log(p);
}

main().catch(console.error).finally(() => prisma.$disconnect());
