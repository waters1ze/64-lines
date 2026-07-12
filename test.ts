import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const purchases = await prisma.purchase.findMany({ orderBy: { createdAt: 'desc' }, take: 10 })
  console.log(purchases)
}
main().catch(console.error).finally(() => prisma.$disconnect())
