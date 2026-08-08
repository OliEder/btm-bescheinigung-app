// E2E: Kompletter Flow (frisch) + Export/Neustart/Import (mit gespeicherter Datei).
import { test, expect } from '@playwright/test';

function collectErrors(page) {
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => {
        if (m.type() === 'error') errors.push('console.error: ' + m.text());
    });
    return errors;
}

async function startFresh(page) {
    await page.goto('/');
    await page.getByRole('button', { name: /Neu anfangen/i }).click();
    await expect(page.locator('#patient-form')).toBeVisible();
}

async function fillAndSavePatient(page) {
    await expect(page.locator('#patient-form')).toBeVisible();
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
    await expect
        .poll(() => page.evaluate(() => window.app.model.data.patients.length))
        .toBe(1);
}

async function fillAndSaveDoctor(page) {
    await page.getByRole('button', { name: /Arzt/i }).click();
    await expect(page.locator('#doctor-form')).toBeVisible();
    await page.fill('#doctor-lastname', 'Schmidt');
    await page.fill('#doctor-firstname', 'Thomas');
    await page.fill('#doctor-phone', '0911/123456');
    await page.fill('#doctor-address', 'Bahnhofstr. 15, 90518 Altdorf');
    await page.click('#doctor-form button[type="submit"]');
    await expect
        .poll(() => page.evaluate(() => window.app.model.data.doctors.length))
        .toBe(1);
}

async function addManualMedication(page, { name, form, substance, concentration }) {
    await page.getByRole('button', { name: /Medikamente/i }).click();
    await expect(page.locator('#manual-medication-form')).toBeVisible();
    await page.fill('#manual-med-name', name);
    await page.selectOption('#manual-med-form', form);
    await page.fill('#manual-med-substance', substance);
    await page.fill('#manual-med-concentration', concentration);
    await page.click('#manual-medication-form button[type="submit"]');
    await expect(page.locator('#selected-medications')).toContainText(name);
    await expect
        .poll(() => page.evaluate(() => window.app.model.data.selectedMedications.length))
        .toBeGreaterThanOrEqual(1);
}

test.describe('Full-Flow BtM-Reisebescheinigung', () => {
    test.beforeEach(async ({ page }) => {
        page.on('dialog', (d) => d.accept());
    });

    test('Kompletter Flow von vorne (frisch)', async ({ page }) => {
        const errors = collectErrors(page);

        await startFresh(page);
        await fillAndSavePatient(page);
        await fillAndSaveDoctor(page);
        await addManualMedication(page, {
            name: 'Concerta',
            form: 'Retardtablette',
            substance: 'Methylphenidat',
            concentration: '36mg',
        });

        // Reisedaten
        await page.getByRole('button', { name: /Reisedaten/i }).click();
        await expect(page.locator('#travel-form')).toBeVisible();
        await page.fill('#travel-start', '2026-08-10');
        await page.fill('#travel-end', '2026-08-24');
        await page.fill('#travel-destination', 'Spanien');
        await page.click('#travel-form button[type="submit"]');
        await expect
            .poll(() => page.evaluate(() => !!window.app.model.data.travelData))
            .toBe(true);

        // Optional: Morgendosis setzen (defensiv, nicht kritisch).
        try {
            const firstDose = page.locator('.dose-input').first();
            if (await firstDose.count()) {
                await firstDose.fill('1');
                await firstDose.dispatchEvent('change');
                await page.waitForTimeout(200);
            }
        } catch (e) {
            // Dosierung ist optional; Bescheinigung wird auch ohne generiert.
        }

        // Formulare: PDFs generieren
        await page.getByRole('button', { name: /Formulare/i }).click();
        await expect(page.locator('#generate-pdfs-btn')).toBeVisible();
        await page.click('#generate-pdfs-btn');

        // Mindestens ein Download-Button beweist, dass Patient+Arzt+Medikament+Reise
        // bis zur PDF-Generierung durchgeflossen sind.
        await expect(page.locator('.download-pdf-btn').first()).toBeVisible();

        // Model-Zustand pruefen
        const state = await page.evaluate(() => ({
            patients: window.app.model.data.patients.length,
            doctors: window.app.model.data.doctors.length,
            meds: window.app.model.data.selectedMedications.length,
            travel: !!window.app.model.data.travelData,
        }));
        expect(state.patients).toBe(1);
        expect(state.doctors).toBe(1);
        expect(state.meds).toBeGreaterThanOrEqual(1);
        expect(state.travel).toBe(true);

        expect(errors).toEqual([]);
    });

    test('Export + Neustart + Import (mit gespeicherter Datei)', async ({ page }) => {
        const errors = collectErrors(page);

        await startFresh(page);
        await fillAndSavePatient(page);
        await fillAndSaveDoctor(page);
        await addManualMedication(page, {
            name: 'Concerta',
            form: 'Retardtablette',
            substance: 'Methylphenidat',
            concentration: '36mg',
        });

        // Export ueber "Gespeicherte Daten"-Tab
        await page.getByRole('button', { name: /Gespeicherte Daten/i }).click();
        await expect(page.locator('#export-all-data-btn')).toBeVisible();
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.click('#export-all-data-btn'),
        ]);
        const filePath = await download.path();
        expect(filePath).toBeTruthy();

        // Frischen Start simulieren
        await page.evaluate(() => sessionStorage.clear());
        await page.reload();
        await expect(page.getByRole('button', { name: /Neu anfangen/i })).toBeVisible();
        await page.getByRole('button', { name: /Neu anfangen/i }).click();
        await expect(page.locator('#patient-form')).toBeVisible();

        // App ist jetzt leer (nichts gespeichert)
        await expect
            .poll(() => page.evaluate(() => window.app.model.data.patients.length))
            .toBe(0);

        // Import der zuvor exportierten Datei
        await page.getByRole('button', { name: /Gespeicherte Daten/i }).click();
        await expect(page.locator('#export-all-data-btn')).toBeVisible();
        await page.setInputFiles('#import-file', filePath);

        // Import ist asynchron (FileReader) -> pollen
        await expect
            .poll(() => page.evaluate(() => window.app.model.data.patients.length), {
                timeout: 10000,
            })
            .toBe(1);

        const state = await page.evaluate(() => ({
            patients: window.app.model.data.patients.length,
            doctors: window.app.model.data.doctors.length,
        }));
        expect(state.patients).toBe(1);
        expect(state.doctors).toBe(1);

        const bodyText = await page.locator('body').innerText();
        expect(bodyText).toContain('Mustermann');
        expect(bodyText).toContain('Schmidt');

        expect(errors).toEqual([]);
    });
});
