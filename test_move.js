const { Chess } = require('chess.js');
const g = new Chess('r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24');
const moveStr = 'f2g3';
try {
  g.move({ from: moveStr.substring(0, 2), to: moveStr.substring(2, 4), promotion: moveStr.length > 4 ? moveStr[4] : undefined });
  console.log('Success!', g.fen());
} catch(e) {
  console.log('Error in move:', e.message);
}

