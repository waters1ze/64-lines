const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findFirst({where: {name: 'Ученик (Тест)'}}).then(console.log);
