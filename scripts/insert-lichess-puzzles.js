const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const prisma = new PrismaClient()

async function main() {
  const filePath = 'new-puzzles.json'
  if (!fs.existsSync(filePath)) {
    console.error(`File ${filePath} not found!`)
    return
  }

  console.log('Reading puzzles from file...')
  const rawData = fs.readFileSync(filePath, 'utf-8')
  const puzzles = JSON.parse(rawData)

  console.log(`Found ${puzzles.length} puzzles. Inserting in chunks...`)
  
  const CHUNK_SIZE = 1000
  let totalInserted = 0

  for (let i = 0; i < puzzles.length; i += CHUNK_SIZE) {
    const chunk = puzzles.slice(i, i + CHUNK_SIZE)
    try {
      const result = await prisma.puzzle.createMany({
        data: chunk,
        skipDuplicates: true
      })
      console.log(`Inserted ${result.count} puzzles in chunk ${i/CHUNK_SIZE + 1}.`)
      totalInserted += result.count
    } catch (err) {
      console.error(`Error inserting chunk ${i/CHUNK_SIZE + 1}:`, err.message)
    }
  }

  console.log(`Insertion complete! Total new puzzles inserted: ${totalInserted}`)
  await prisma.$disconnect()
}

main().catch(console.error)
