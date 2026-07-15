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
  const ratingRanges = [
    { min: 800, max: 1200, count: 1000 },
    { min: 1200, max: 1600, count: 1000 },
    { min: 1600, max: 2000, count: 1000 },
    { min: 2000, max: 2500, count: 1000 }
  ]

  let totalInserted = 0

  for (const range of ratingRanges) {
    const puzzles = await fetchPuzzles(range.min, range.max, range.count)
    if (puzzles.length === 0) continue

    console.log(`Received ${puzzles.length} puzzles for range ${range.min}-${range.max}. Inserting...`)
    let insertedForRange = 0

    for (const p of puzzles) {
      try {
        await prisma.puzzle.upsert({
          where: { id: p.PuzzleId },
          update: {},
          create: {
            id: p.PuzzleId,
            fen: p.FEN,
            moves: p.Moves,
            rating: p.Rating,
            ratingDeviation: p.RatingDeviation || 0,
            themes: p.Themes || '',
            openingTags: p.OpeningTags || ''
          }
        })
        insertedForRange++
      } catch (err) {
        // Silently skip duplicates or errors
      }
    }
    console.log(`Successfully inserted ${insertedForRange} puzzles for this range.`)
    totalInserted += insertedForRange
  }

  console.log(`Seeding complete! Total puzzles inserted: ${totalInserted}`)
  await prisma.$disconnect()
}

seed().catch(console.error)
