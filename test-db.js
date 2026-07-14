const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.liveSession.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }).then(console.log);
