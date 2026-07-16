const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fetchPuzzles(minRating, maxRating, limit) {
  console.log(`Fetching puzzles between ${minRating} and ${maxRating}...`)
  const url = `https://chess-puzzles-api.vercel.app/puzzles?min_rating=${minRating}&max_rating=${maxRating}&limit=${limit}`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('API Error: ' + res.status)
    const data = await res.json()
    return data
  } catch (error) {
    console.error(`Error fetching puzzles:`, error)
    return []
  }
}

async function seed() {
  const ratingRanges = []
  // 10 point increments to get fresh batches, from 2200 to 2900
  for (let i = 2200; i < 2900; i += 10) {
    ratingRanges.push({ min: i, max: i + 9, count: 500 })
  }

  let totalInserted = 0
  const TARGET = 3000

  for (const range of ratingRanges) {
    if (totalInserted >= TARGET) break;

    const puzzles = await fetchPuzzles(range.min, range.max, range.count)
    if (puzzles.length === 0) continue

    const dataToInsert = puzzles.map(p => ({
      id: String(p.PuzzleId),
      fen: String(p.FEN || ''),
      moves: String(p.Moves || ''),
      rating: Number(p.Rating) || 2200,
      ratingDeviation: Number(p.RatingDeviation) || 0,
      themes: String(p.Themes || ''),
      openingTags: String(p.OpeningTags || '')
    }))

    let insertedForRange = 0
    try {
      const result = await prisma.puzzle.createMany({
        data: dataToInsert,
        skipDuplicates: true
      })
      insertedForRange = result.count
    } catch (err) {
      console.error('Error during bulk insert:', err)
    }
    console.log(`Inserted ${insertedForRange} puzzles for range ${range.min}-${range.max}.`)
    totalInserted += insertedForRange
  }

  console.log(`Seeding complete! Total new puzzles inserted: ${totalInserted}`)
  await prisma.$disconnect()
}

seed().catch(console.error)
