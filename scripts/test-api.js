const fetch = require('node-fetch');

async function testApi() {
  const url1 = 'https://chess-puzzles-api.vercel.app/puzzles?min_rating=1000&max_rating=1000&limit=5';
  const url2 = 'https://chess-puzzles-api.vercel.app/puzzles?min_rating=1000&max_rating=1000&limit=5&page=2';
  const url3 = 'https://chess-puzzles-api.vercel.app/puzzles?min_rating=1000&max_rating=1000&limit=5&offset=5';
  
  const [res1, res2, res3] = await Promise.all([
    fetch(url1).then(r => r.json()),
    fetch(url2).then(r => r.json()),
    fetch(url3).then(r => r.json())
  ]);
  
  console.log('Default:', res1.map(p => p.PuzzleId));
  console.log('Page 2:', res2.map(p => p.PuzzleId));
  console.log('Offset 5:', res3.map(p => p.PuzzleId));
}
testApi();
