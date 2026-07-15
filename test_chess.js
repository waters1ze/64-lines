const { Chess } = require('chess.js');
try {
  const g = new Chess('r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24');
  console.log('Success:', g.fen());
} catch(e) {
  console.log('Error:', e.message);
}

