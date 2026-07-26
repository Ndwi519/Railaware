const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

function waitForServer(port, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        return reject(new Error('Server did not start in time'));
      }
      const req = http.get(`http://localhost:${port}/api/v1/health`, (res) => {
        if (res.statusCode === 200) {
          clearInterval(interval);
          resolve();
        }
      });
      req.on('error', () => { /* ignore */ });
    }, 100);
  });
}

function makeGetRequest(port, path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}${path}`, (res) => {
      resolve(res.statusCode);
    }).on('error', reject);
  });
}

describe('Evaluation Router Mounting (Integration)', () => {
  let serverProcess;
  jest.setTimeout(15000);

  afterEach(() => {
    if (serverProcess) {
      serverProcess.kill('SIGINT');
      serverProcess = null;
    }
  });

  function startServerTest(port, envVars) {
    return new Promise((resolve) => {
      serverProcess = spawn('node', [path.join(__dirname, '../../server.js')], {
        env: { ...process.env, ...envVars, PORT: port, RAILRADAR_KEY: 'test' }
      });
      serverProcess.stderr.on('data', data => console.error(`SERVER STDERR: ${data}`));
      resolve();
    });
  }

  it('mounts the evaluation router in development mode', async () => {
    const port = 5111;
    await startServerTest(port, { NODE_ENV: 'development' });

    await waitForServer(port);
    const statusCode = await makeGetRequest(port, '/api/v1/evaluation/scenarios');
    // Expect 200 OK because router is mounted
    expect(statusCode).toBe(200);
  });

  it('disables the evaluation router in production mode', async () => {
    const port = 5112;
    await startServerTest(port, { NODE_ENV: 'production' });

    await waitForServer(port);
    const statusCode = await makeGetRequest(port, '/api/v1/evaluation/scenarios');
    // Expect 404 Not Found because router is NOT mounted
    expect(statusCode).toBe(404);
  });
});
