const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.liveSession.findFirst({
  where: { teacherId: 'cmrglcco70001l5041ipjes60' },
  orderBy: { createdAt: 'desc' }
}).then(console.log);
