const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findUnique({where: {id: 'cmrgthxs10002l404gxcq3985'}}).then(console.log);
