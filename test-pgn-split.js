const { parse } = require('@mliebelt/pgn-parser');
const pgn = `[Event "FIDE World Cup 2017"]
[White "Carlsen,M"]
[Black "Bu Xiangzhi"]

1. e4 c5 2. Nf3 d6`;

const blocks = pgn.split(/(?=\[Event )/).map(s => s.trim()).filter(Boolean);
for (const block of blocks) {
  console.log("Parsing block...");
  try {
    const res = parse(block, { startRule: 'game' });
    console.log(res.tags);
  } catch (e) {
    console.log("Error:", e.message);
  }
}
