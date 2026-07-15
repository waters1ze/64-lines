const { Chess } = require('chess.js');
const g = new Chess();
try {
  g.move({ from: 'e2', to: 'e4', promotion: undefined });
  console.log('Success:', g.fen());
} catch(e) {
  console.log('Error:', e.message);
}

