const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany()
  console.log('Registered users:', users.map(u => u.email))
}
main().finally(() => prisma.$disconnect())
