import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const count = await db.puzzle.count();
  const mateIn3 = await db.puzzle.count({ where: { themes: { contains: 'mateIn3' } } });
  console.log('Total puzzles:', count);
  console.log('Mate in 3 puzzles:', mateIn3);
  
  const sample = await db.puzzle.findFirst({ where: { themes: { contains: 'mateIn3' } }});
  console.log('Sample:', sample);
}
main().finally(() => db.$disconnect());
