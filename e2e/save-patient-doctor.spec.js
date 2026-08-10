// Reproduktion: werden Patienten- UND Arztdaten beim frischen Durchlauf gespeichert und angezeigt?
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    page.on('dialog', (d) => d.accept());
});

async function startFresh(page) {
    await page.goto('/');
    await page.getByRole('button', { name: /Neu anfangen/i }).click();
}

async function fillPatient(page) {
    await page.fill('#patient-lastname', 'Mustermann');
    await page.fill('#patient-firstname', 'Max');
    await page.fill('#patient-passport', 'C01X00T47');
    await page.fill('#patient-birthplace', 'Berlin');
    await page.fill('#patient-birthdate', '1990-05-01');
    await page.fill('#patient-nationality', 'Deutsch');
    await page.selectOption('#patient-gender', 'männlich');
    await page.fill('#patient-street', 'Hauptstr. 1');
    await page.fill('#patient-zip', '10115');
    await page.fill('#patient-city', 'Berlin');
    await page.click('#patient-form button[type="submit"]');
}

async function fillDoctor(page) {
    await page.fill('#doctor-lastname', 'Schmidt');
    await page.fill('#doctor-firstname', 'Thomas');
    await page.fill('#doctor-phone', '0911/123456');
    await page.fill('#doctor-address', 'Bahnhofstr. 15, 90518 Altdorf');
    await page.click('#doctor-form button[type="submit"]');
}

test('Patient + Arzt: voller Flow inkl. Tab-Wechsel + Anzeige', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

    await startFresh(page);
    await fillPatient(page);
    await page.waitForTimeout(200);

    // Tab -> Arzt
    await page.getByRole('tab', { name: /Arzt/i }).click();
    await expect(page.locator('#doctor-form')).toBeVisible();
    await fillDoctor(page);
    await page.waitForTimeout(200);

    // Model-Zustand
    const state = await page.evaluate(() => ({
        patients: window.app?.model?.data?.patients?.length ?? -1,
        doctors: window.app?.model?.data?.doctors?.length ?? -1,
        currentPatient: window.app?.model?.data?.currentPatient?.lastname ?? null,
        currentDoctor: window.app?.model?.data?.currentDoctor?.lastname ?? null,
        session: sessionStorage.getItem('btm-session-data') ? 'JA' : 'NEIN',
    }));
    console.log('--- MODEL STATE ---', JSON.stringify(state, null, 2));

    // Tab -> Gespeicherte Daten, pruefen ob beide angezeigt werden
    await page.getByRole('tab', { name: /Gespeicherte Daten/i }).click();
    await page.waitForTimeout(200);
    const savedText = await page.locator('#data-tab, #saved-patients, #saved-doctors').allInnerTexts().catch(() => []);
    const bodyText = await page.locator('body').innerText();
    console.log('--- zeigt "Mustermann"? ---', bodyText.includes('Mustermann'));
    console.log('--- zeigt "Schmidt"? ---', bodyText.includes('Schmidt'));
    console.log('--- ERRORS ---', JSON.stringify(errors, null, 2));

    expect(errors).toEqual([]);
    expect(state.patients, 'Patient gespeichert').toBe(1);
    expect(state.doctors, 'Arzt gespeichert').toBe(1);
    expect(bodyText, 'Patient wird angezeigt').toContain('Mustermann');
    expect(bodyText, 'Arzt wird angezeigt').toContain('Schmidt');
});
