import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[ERROR] ${err.message}`));
  
  const network = [];
  page.on('response', async (res) => {
    if (res.url().includes('/api/v1/observation')) {
      const status = res.status();
      let body = '';
      try { body = await res.text(); } catch (err) { 
        body = 'Could not read body'; 
        console.warn('[trace-frontend] Failed to read response text:', err.message);
      }
      network.push({ url: res.url(), status, body });
    }
  });

  await page.goto('http://localhost:5173/');
  
  // Wait for the Settings button (Diagnostics Panel)
  await page.getByRole('button', { name: 'Developer Diagnostics' }).waitFor();
  await page.getByRole('button', { name: 'Developer Diagnostics' }).click();
  
  // Wait for the panel to open by waiting for its heading
  await page.getByRole('heading', { name: /Diagnostics Panel/i }).waitFor();
  
  // Activate simulation
  await page.getByRole('button', { name: /ENABLE SIMULATION/i }).click();
  
  // Find inputs and fill them
  await page.getByPlaceholder('Latitude').fill('26.9197');
  await page.getByPlaceholder('Longitude').fill('75.7893');

  // Click Apply Coordinates
  await page.getByRole('button', { name: /APPLY COORDINATES/i }).click();
  
  // Wait a few seconds for request to complete
  await page.waitForTimeout(5000);
  
  console.log("=== BROWSER CONSOLE LOGS ===");
  logs.forEach(l => console.log(l));
  
  console.log("\\n=== NETWORK RESPONSES ===");
  network.forEach(n => {
    console.log(`URL: ${n.url}`);
    console.log(`STATUS: ${n.status}`);
    console.log(`BODY: ${n.body}`);
  });

  await browser.close();
})();
