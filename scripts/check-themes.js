const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const puzzles = await prisma.puzzle.findMany({
    select: { themes: true }
  })
  
  const uniqueThemes = new Set()
  puzzles.forEach(p => {
    if (p.themes) {
      p.themes.split(' ').forEach(t => {
        if (t.trim()) {
          uniqueThemes.add(t.trim())
        }
      })
    }
  })
  
  console.log('Unique themes in database:', Array.from(uniqueThemes).sort())
}

main().catch(console.error).finally(() => prisma.$disconnect())
