const { test, expect } = require('@playwright/test');

test('start screen is visible', async ({ page }) => {
    await page.goto('/');

    // Assert the "Willkommen" start screen renders (Card-Titel; Shell setzt
    // zusätzlich denselben Text im Header, daher gezielt auf die Karte prüfen).
    await expect(page.locator('.rb-card__title', { hasText: 'Willkommen' })).toBeVisible();

    // And the primary start action is present.
    await expect(page.getByRole('button', { name: /Neu anfangen/ })).toBeVisible();
});
