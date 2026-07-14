const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.liveSession.findFirst({
  where: {
    OR: [ { teacherId: 'cmrglcco70001l5041ipjes60' }, { studentId: 'cmrjt33xn0000esscu5bjw5qn' } ],
    status: 'ACTIVE'
  }
}).then(console.log);
