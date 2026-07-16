const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const maxPuzzle = await prisma.puzzle.findFirst({
    orderBy: { rating: 'desc' },
  });
  console.log('Max Rating:', maxPuzzle ? maxPuzzle.rating : 'None');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
