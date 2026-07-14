const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const puzzles = [
  { id: '00008', fen: 'r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24', moves: 'f2g3 e6e7 b2b1 b3c1 b1c1 h6c1', rating: 1925, themes: 'crushing hangingPiece long middlegame', ratingDeviation: 74, openingTags: '' },
  { id: '0000D', fen: '5rk1/1p3ppp/pq3b2/8/8/1P1Q1N2/P4PPP/3R2K1 w - - 2 27', moves: 'd3d6 f8d8 d6d8 f6d8', rating: 1518, themes: 'advantage endgame short', ratingDeviation: 75, openingTags: '' },
  { id: '0009B', fen: 'r2qr1k1/b1p2ppp/pp4n1/P1P1p3/4P1n1/B2P2Pb/3NBP1P/RN1QR1K1 b - - 1 16', moves: 'b6c5 e2g4 h3g4 d1g4', rating: 1108, themes: 'advantage middlegame short', ratingDeviation: 74, openingTags: 'Kings_Pawn_Game' },
  { id: '000aY', fen: 'r4rk1/pp3ppp/2n1b3/q1pp2B1/8/P1Q2NP1/1PP1PP1P/2KR3R w - - 0 15', moves: 'g5e7 a5c3 b2c3 c6e7', rating: 1451, themes: 'advantage middlegame short', ratingDeviation: 74, openingTags: 'Nimzo-Indian' },
  { id: '000c8', fen: 'r1bqk2r/pp2bppp/2n5/2ppP3/3P4/5N2/PP1NBPPP/R2QK2R b KQkq - 0 9', moves: 'c6d4 f3d4 c5d4', rating: 1044, themes: 'advantage opening short', ratingDeviation: 74, openingTags: 'French_Defense' },
  { id: '000dF', fen: 'r1bq1rk1/1ppp1pbp/p1n2np1/4p3/B3P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 1 8', moves: 'c1g5 b7b5 a4b3', rating: 1060, themes: 'advantage opening short', ratingDeviation: 74, openingTags: 'Ruy_Lopez' },
  { id: '000hf', fen: 'r1bqk2r/pp1nbppp/2p1pn2/6B1/2BP4/4PN2/PP3PPP/RN1Q1RK1 w kq - 1 8', moves: 'b1c3 f6d5 g5e7', rating: 1205, themes: 'advantage master opening short', ratingDeviation: 76, openingTags: 'Queens_Gambit' },
  { id: '000iK', fen: '6k1/1p4p1/p1p2r1p/3p1q2/3P4/2P3QP/PP4P1/4R1K1 b - - 1 29', moves: 'f5c2 e1e7 c2b1 g1h2', rating: 2197, themes: 'crushing endgame short', ratingDeviation: 76, openingTags: '' },
  { id: '000jS', fen: 'r1b2r1k/1pp2q1p/n2p3P/p1nPp1Q1/2P1P1p1/2N3N1/PP2B3/R3K2R w KQ - 1 21', moves: 'h1f1 f7f1 g3f1', rating: 1530, themes: 'advantage middlegame short', ratingDeviation: 75, openingTags: 'Kings_Indian' },
  { id: '000k9', fen: '5r2/8/p1rpkP1R/8/2p1p3/P1R5/1PP5/2K5 w - - 0 35', moves: 'c1d2 f8f6 h6f6 e6f6', rating: 1224, themes: 'crushing endgame rookEndgame short', ratingDeviation: 76, openingTags: '' }
]
async function main() {
  for (const puzzle of puzzles) {
    await prisma.puzzle.upsert({ where: { id: puzzle.id }, update: {}, create: puzzle })
  }
  console.log('Puzzles seeded!')
}
main().catch(console.error).finally(() => prisma.$disconnect())
