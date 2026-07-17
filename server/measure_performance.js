import fs from 'fs';

async function run() {
  console.log("Measuring performance...");
  const startMemory = process.memoryUsage();
  
  const lat = 26.9205;
  const lng = 75.7876;

  let errors = 0;
  let statusCodes = {};
  
  const measureRun = async (count) => {
      const times = [];
      const memBefore = process.memoryUsage();
      for (let i = 0; i < count; i++) {
        const t0 = performance.now();
        try {
          const res = await fetch('http://localhost:3001/api/v1/observation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng })
          });
          statusCodes[res.status] = (statusCodes[res.status] || 0) + 1;
          await res.json();
        } catch(e) {
          errors++;
        }
        const t1 = performance.now();
        times.push(t1 - t0);
      }
      const memAfter = process.memoryUsage();
      const avg = times.reduce((a,b)=>a+b,0) / times.length;
      times.sort((a,b)=>a-b);
      const p95 = times[Math.floor(times.length * 0.95)];
      const max = times[times.length - 1];
      
      console.log(`\n--- Run of ${count} requests ---`);
      console.log(`Average API response time: ${avg.toFixed(2)}ms`);
      console.log(`95th percentile response: ${p95.toFixed(2)}ms`);
      console.log(`Slowest request: ${max.toFixed(2)}ms`);
      console.log(`Status codes:`, statusCodes);
      console.log(`Memory Usage Before: RSS ${Math.round(memBefore.rss/1024/1024)}MB, Heap ${Math.round(memBefore.heapUsed/1024/1024)}MB`);
      console.log(`Memory Usage After: RSS ${Math.round(memAfter.rss/1024/1024)}MB, Heap ${Math.round(memAfter.heapUsed/1024/1024)}MB`);
      statusCodes = {};
  };

  await measureRun(100);
  await measureRun(1000);
}

run();
