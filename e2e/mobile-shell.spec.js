const { test, expect } = require('@playwright/test');

for (const width of [320, 375]) {
  test(`Shell mobil @${width}px: Tab-Leiste läuft nicht über, alle 6 Tabs sichtbar`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await page.goto('/');
    await page.getByRole('button', { name: /Neu anfangen/ }).click();
    await page.waitForSelector('#patient-form', { timeout: 8000 });

    const m = await page.evaluate(() => {
      const tabs = document.querySelector('.shell-tabs');
      const btns = [...document.querySelectorAll('[role=tab]')];
      const doc = document.documentElement;
      return {
        tabsOverflow: tabs.scrollWidth > tabs.clientWidth + 1,
        tabCount: btns.length,
        maxRight: Math.max(...btns.map((b) => Math.round(b.getBoundingClientRect().right))),
        innerWidth: window.innerWidth,
        pageOverflow: doc.scrollWidth > window.innerWidth + 1,
      };
    });

    expect(m.tabCount).toBe(6);
    expect(m.tabsOverflow).toBe(false);
    expect(m.maxRight).toBeLessThanOrEqual(m.innerWidth + 1);
    expect(m.pageOverflow).toBe(false);
  });
}
