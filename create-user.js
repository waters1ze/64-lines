const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function main() { 
  await prisma.user.create({
    data: {
      email: 'tranthuhoai2937@gmail.com', 
      name: 'Ученик (Тест)', 
      role: 'STUDENT',
      passwordHash: 'dummyhash'
    }
  }); 
  console.log('Recreated user'); 
} 

main().catch(console.error).finally(() => prisma.$disconnect());
