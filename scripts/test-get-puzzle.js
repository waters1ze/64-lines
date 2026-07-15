const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found');
    return;
  }
  console.log('User:', user.email);
  const targetRating = user.rating || 1200;

  // Mimic first-stage target range query
  const puzzles = await prisma.puzzle.findMany({
    where: {
      rating: {
        gte: targetRating - 100,
        lte: targetRating + 100,
      }
    },
    take: 3
  });
  console.log('Puzzles target sample:', puzzles);
}

main().finally(() => prisma.$disconnect());
