import fetch from 'node-fetch';

async function fetchObservation(lat, lng, expectedPort) {
    const start = Date.now();
    try {
        const res = await fetch(`http://localhost:${expectedPort || 3001}/api/v1/observation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng })
        });
        const duration = Date.now() - start;
        return { status: res.status, duration };
    } catch (e) {
        return { status: 'ERROR', duration: Date.now() - start, error: e.message };
    }
}

async function testScenarioA() {
    console.log(`\n=== SCENARIO A: 26.9197, 75.7893 (Valid Corridor) ===`);
    console.log("Request 1...");
    const r1 = await fetchObservation(26.9197, 75.7893);
    console.log(`R1 Status: ${r1.status}, Duration: ${r1.duration}ms`);
    
    console.log("Waiting 2s...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log("Request 2...");
    const r2 = await fetchObservation(26.9197, 75.7893);
    console.log(`R2 Status: ${r2.status}, Duration: ${r2.duration}ms`);
}

async function testScenarioB() {
    console.log(`\n=== SCENARIO B: 0, 0 (Null Island) ===`);
    console.log("Request 1...");
    const r1 = await fetchObservation(0, 0);
    console.log(`R1 Status: ${r1.status}, Duration: ${r1.duration}ms`);
    
    console.log("Waiting 2s...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log("Request 2...");
    const r2 = await fetchObservation(0, 0);
    console.log(`R2 Status: ${r2.status}, Duration: ${r2.duration}ms`);
}

async function testScenarioD() {
    console.log(`\n=== SCENARIO D: 10 Concurrent Requests (New location 28.6139, 77.2090) ===`);
    console.log("Firing 10 concurrent requests...");
    const promises = [];
    for (let i = 0; i < 10; i++) {
        promises.push(fetchObservation(28.6139, 77.2090));
    }
    
    const results = await Promise.all(promises);
    results.forEach((r, idx) => {
        console.log(`R${idx+1} Status: ${r.status}, Duration: ${r.duration}ms`);
    });
}

async function run() {
    await testScenarioA();
    await testScenarioB();
    await testScenarioD();
}

run();
