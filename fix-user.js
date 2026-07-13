const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function main() { 
  const user = await prisma.user.findUnique({where:{email:'tranthuhoai2937@gmail.com'}}); 
  console.log('Found user:', user); 
  
  if(user) { 
    await prisma.user.update({
      where:{email:'tranthuhoai2937@gmail.com'}, 
      data:{teacherId: null}
    }); 
    console.log('Updated teacherId to null'); 
  } else {
    // If deleted, we can't recover easily unless we create a new one, but let's just see.
    console.log('User was completely deleted in the database.');
  }
} 

main().catch(console.error).finally(() => prisma.$disconnect());
