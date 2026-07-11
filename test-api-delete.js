const http = require('http');

async function test() {
  const fetch = (await import('node-fetch')).default || globalThis.fetch;
  
  // Try to hit the API route directly to see what it returns
  try {
    const res = await fetch('http://localhost:3000/api/homework/invalid-id', { method: 'DELETE' });
    console.log("Response status:", res.status);
    const text = await res.text();
    console.log("Response body:", text);
  } catch (e) {
    console.error("Fetch failed:", e.message);
  }
}

test();
