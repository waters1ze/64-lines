import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const m4 = await db.puzzle.count({ where: { themes: { contains: 'mateIn4' } } });
  const m5 = await db.puzzle.count({ where: { themes: { contains: 'mateIn5' } } });
  console.log('Mate in 4:', m4, 'Mate in 5:', m5);
}
main().finally(() => db.$disconnect());
