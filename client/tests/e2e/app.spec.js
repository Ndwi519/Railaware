import { test, expect } from '@playwright/test';

test.describe('RailAware E2E', () => {
  test.beforeEach(async ({ context }) => {
    // Mock geolocation to grant permission and return a specific location
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 28.6, longitude: 77.2 });
  });

  test('loads live map page and shows loading state', async ({ page }) => {
    // Mock API response
    await page.route('**/api/v1/observation', async (route) => {
      const json = {
        observation: { status: 'UNKNOWN' },
        awareness: { status: 'DISTANT', requiresProminentDisplay: false },
      };
      await route.fulfill({ json });
    });

    await page.goto('/');

    // Check if the title or main container is visible
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });

    // Verify the awareness pipeline is rendering
    await expect(page.getByText('Status: Distant')).toBeVisible();
  });
});
