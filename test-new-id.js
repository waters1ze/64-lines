const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findFirst({where: {email: 'tranthuhoai2937@gmail.com'}}).then(console.log);
