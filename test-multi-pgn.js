const fs = require('fs');
const { Chess } = require('chess.js');

const pgn = `[Event "Steinitz - Zukertort"]
[Site "London"]
[Date "1872.08.08"]
[White "Steinitz,W"]
[Black "Zukertort,J"]
[Result "1-0"]
[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]

1. e4 e5 2. Nf3 Nc6

[Event "Steinitz - Zukertort 2"]
[Site "London"]
[Date "1872.08.17"]
[White "Steinitz,W"]
[Black "Zukertort,J"]
[Result "1-0"]

1. d4 d5 2. c4 e6
`;

function parseHwPgnList(pgnStr) {
  // Try splitting by [Event
  const blocks = pgnStr.split(/(?=\[Event )/).map(s => s.trim()).filter(Boolean);
  if (blocks.length === 0 && pgnStr.trim()) blocks.push(pgnStr); // Fallback
  
  return blocks.map(block => {
    try {
      let normalizedPgn = block
      const fenMatch = block.match(/\[FEN "(.+?)"\]/)
      const startFen = fenMatch?.[1] ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      if (fenMatch && !block.includes('[SetUp "1"]')) {
        normalizedPgn = '[SetUp "1"]\n' + block
      }
      const g = new Chess()
      g.loadPgn(normalizedPgn)
      return { startFen, solution: g.history() }
    } catch {
      return null;
    }
  }).filter(Boolean);
}

console.log(parseHwPgnList(pgn));
