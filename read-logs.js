const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.message.findMany({
  where: { content: { startsWith: 'Poll /api/live' } },
  orderBy: { createdAt: 'desc' },
  take: 10
}).then(console.log);
