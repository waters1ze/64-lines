const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.puzzle.count().then(count => {
  console.log('Count:', count);
}).finally(() => {
  prisma.$disconnect();
});
