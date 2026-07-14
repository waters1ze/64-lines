const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.liveSession.findFirst({ orderBy: { createdAt: 'desc' } }).then(console.log);
