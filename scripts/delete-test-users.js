const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Deleting test users...')
  
  // Cascade deletes will clean up related records (homeworks, purchases, etc.)
  const result = await prisma.user.deleteMany()
  
  console.log(`Deleted ${result.count} users successfully!`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
