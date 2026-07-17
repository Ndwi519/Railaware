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

async function main() {
    console.log('Starting Server for Scenario D...');
    const serverProcess = spawn('node', ['server/server.js'], { 
        env: { ...process.env, NODE_ENV: 'development', PORT: '3001' },
        stdio: 'pipe'
    });

    let serverLogs = [];
    serverProcess.stdout.on('data', data => serverLogs.push(data.toString()));
    serverProcess.stderr.on('data', data => serverLogs.push(data.toString()));

    await new Promise(resolve => setTimeout(resolve, 3000)); // wait for start

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

    serverProcess.kill();
    fs.writeFileSync('server-logs-d.txt', serverLogs.join(''));
    console.log('\nServer logs saved to server-logs-d.txt');
}

main();
