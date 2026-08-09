const { test, expect } = require('@playwright/test');

test('start screen is visible', async ({ page }) => {
    await page.goto('/');

    // Assert the "Willkommen" start screen renders.
    await expect(page.getByText(/Willkommen/)).toBeVisible();

    // And the primary start action is present.
    await expect(page.getByRole('button', { name: /Neu anfangen/ })).toBeVisible();
});
