const urls = ['castle', 'rook-chess', 'chess-rook'].map(x => `https://img.icons8.com/3d-fluency/48/${x}.png`);
Promise.all(urls.map(u => fetch(u).then(r => r.status))).then(console.log);
