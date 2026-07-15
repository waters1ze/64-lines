async function run() {
  const targetRating = 1450;
  const res = await fetch(`https://chess-puzzles.p.rapidapi.com/?rating=${targetRating}&count=1`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'chess-puzzles.p.rapidapi.com',
        'x-rapidapi-key': '11089b4e0bmsh26773ff32f030c1p17ad8djsn39bdeef95907'
      }
    });
  const data = await res.json();
  console.log(data);
}
run();
