import { test, expect } from '@playwright/test';

test('verify useAwareness throttle drops updates safely', async ({ page }) => {
  test.setTimeout(60000);
  // We want to count how many times /api/v1/awareness is called
  let apiCalls = 0;
  let apiPayloads = [];
  
  page.on('request', request => {
    if (request.url().includes('awareness') && request.method() === 'POST') {
      const payload = request.postDataJSON();
      apiPayloads.push(payload);
      console.log('Request to', request.url(), payload);
    }
  });

  // Start with a mock geolocation
  await page.context().grantPermissions(['geolocation']);
  await page.context().setGeolocation({ latitude: 10, longitude: 20 });
  
  await page.goto('http://localhost:5173');

  // Let the page load
  await page.waitForTimeout(2000);

  // Now, simulate rapid GPS updates (1 update per second) for 30 seconds
  for (let i = 0; i < 30; i++) {
    await page.context().setGeolocation({ latitude: 10 + (i * 0.0001), longitude: 20 + (i * 0.0001) });
    await page.waitForTimeout(1000);
  }
  
  // Wait a little bit for any trailing requests
  await page.waitForTimeout(2000);
  
  console.log(`Total API calls to /api/v1/awareness: ${apiPayloads.length}`);
  console.log('First 3 payloads:', apiPayloads.slice(0, 3));
  const finalPayload = apiPayloads[apiPayloads.length - 1];
  console.log('Final payload:', finalPayload);
  
  // The loop ends at i = 29
  expect(finalPayload.lat).toBeCloseTo(10.0029, 4);
  expect(finalPayload.lng).toBeCloseTo(20.0029, 4);
});
