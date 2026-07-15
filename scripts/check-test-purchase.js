const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const purchase = await prisma.purchase.findUnique({
    where: { id: 'cmrm7dqm00001esr0e79ozctx' },
    include: { user: true }
  })
  console.log('Purchase Status:', purchase.status)
  console.log('Purchase Comment:', purchase.comment)
  console.log('Amount snapshot:', purchase.amount)
}

main().catch(console.error).finally(() => prisma.$disconnect())
