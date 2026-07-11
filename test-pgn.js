const { parse } = require('@mliebelt/pgn-parser');
const pgn = `[Event "FIDE World Cup 2017"]
[White "Carlsen,M"]
[Black "Bu Xiangzhi"]

1. e4 c5 (1... e5 2. Nf3) 2. Nf3 d6 *`;
const parsed = parse(pgn);
console.log(JSON.stringify(parsed, null, 2));
