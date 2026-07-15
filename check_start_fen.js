const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const p = await prisma.puzzle.findFirst({ where: { fen: 'start' } });
  console.log(p);
}
run().finally(() => prisma.$disconnect());
