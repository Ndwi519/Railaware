import { spawn } from 'node:child_process';
import fs from 'node:fs';

const PORT = 3001;

async function fetchObservation(lat, lng) {
    const start = Date.now();
    try {
        const res = await fetch(`http://localhost:${PORT}/api/v1/observation`, {
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

async function runScenario(name, action) {
    console.log(`\n=== ${name} ===`);
    await action();
}

async function main() {
    console.log('Starting Server for Scenarios A, B, D...');
    const serverProcess = spawn('node', ['server/server.js'], { 
        env: { ...process.env, NODE_ENV: 'development', PORT: '3001' },
        stdio: 'pipe'
    });

    let serverLogs = [];
    serverProcess.stdout.on('data', data => serverLogs.push(data.toString()));
    serverProcess.stderr.on('data', data => serverLogs.push(data.toString()));

    await new Promise(resolve => setTimeout(resolve, 3000)); // wait for start

    await runScenario('SCENARIO A: 26.9197, 75.7893 (Valid Corridor)', async () => {
        console.log("Request 1...");
        const r1 = await fetchObservation(26.9197, 75.7893);
        console.log(`R1 Status: ${r1.status}, Duration: ${r1.duration}ms`);
        console.log("Waiting 2s...");
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log("Request 2...");
        const r2 = await fetchObservation(26.9197, 75.7893);
        console.log(`R2 Status: ${r2.status}, Duration: ${r2.duration}ms`);
    });

    await runScenario('SCENARIO B: 0, 0 (Null Island)', async () => {
        console.log("Request 1...");
        const r1 = await fetchObservation(0, 0);
        console.log(`R1 Status: ${r1.status}, Duration: ${r1.duration}ms`);
        console.log("Waiting 2s...");
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log("Request 2...");
        const r2 = await fetchObservation(0, 0);
        console.log(`R2 Status: ${r2.status}, Duration: ${r2.duration}ms`);
    });

    await runScenario('SCENARIO D: 10 Concurrent Requests', async () => {
        console.log("Firing 10 concurrent requests to 28.6139, 77.2090...");
        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(fetchObservation(28.6139, 77.2090));
        }
        const results = await Promise.all(promises);
        results.forEach((r, idx) => {
            console.log(`R${idx+1} Status: ${r.status}, Duration: ${r.duration}ms`);
        });
    });

    serverProcess.kill();
    fs.writeFileSync('server-logs-abd.txt', serverLogs.join(''));
    console.log('\nServer logs saved to server-logs-abd.txt');

    console.log('\nStarting Server for Scenario C (Forced Outage)...');
    const serverProcessC = spawn('node', ['server/server.js'], { 
        env: { ...process.env, NODE_ENV: 'development', PORT: '3001', OVERPASS_URL: 'http://this-domain-definitely-does-not-exist.test:59999/dummy' },
        stdio: 'pipe'
    });

    let serverLogsC = [];
    serverProcessC.stdout.on('data', data => serverLogsC.push(data.toString()));
    serverProcessC.stderr.on('data', data => serverLogsC.push(data.toString()));

    await new Promise(resolve => setTimeout(resolve, 3000)); // wait for start

    await runScenario('SCENARIO C: Force Overpass unavailable', async () => {
        console.log("Request 1 (Expect MISS -> Retries -> FAILURE MISS cache written)...");
        const r1 = await fetchObservation(10, 10);
        console.log(`R1 Status: ${r1.status}, Duration: ${r1.duration}ms`);
        console.log("Waiting 2s...");
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log("Request 2 (Expect CACHE FAILURE HIT, extremely fast)...");
        const r2 = await fetchObservation(10, 10);
        console.log(`R2 Status: ${r2.status}, Duration: ${r2.duration}ms`);
    });

    serverProcessC.kill();
    fs.writeFileSync('server-logs-c.txt', serverLogsC.join(''));
    console.log('Server logs saved to server-logs-c.txt');
}

main();
