const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const puzzles = await prisma.puzzle.findMany({ where: { rating: 1451 } });
  console.log(puzzles);
}
run().finally(() => prisma.$disconnect());
