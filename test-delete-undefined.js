const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const res = await prisma.homework.delete({ where: { id: undefined } })
    console.log("Deleted successfully:", res)
  } catch (e) {
    console.error("Failed to delete:", e.message)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
