const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const hws = await prisma.homework.findMany()
  console.log("Homeworks in DB:", hws.map(h => ({ id: h.id, title: h.title })))
  
  if (hws.length > 0) {
    const hwToDelete = hws[0]
    console.log("Deleting:", hwToDelete.id)
    try {
      const res = await prisma.homework.delete({ where: { id: hwToDelete.id } })
      console.log("Deleted successfully:", res)
    } catch (e) {
      console.error("Failed to delete:", e.message)
    }
  } else {
    console.log("No homeworks to delete.")
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
