// Idempotente Migration bestehender Resources: substanceId + btmStatus nachtragen,
// Guanfacin-ATC auf N06BA21 korrigieren, btmCategory aus btmStatus ableiten.
// Resources, die bereits substanceId haben (Opioide), bleiben unveraendert.
// Aufruf: node scripts/migrate-medications-substanceid.mjs
import { readFileSync, writeFileSync } from 'node:fs';

// Wirkstoffname -> substanceId (ADHS-Bestand)
const BY_SUBSTANCE = {
    Methylphenidat: 'methylphenidat',
    Lisdexamfetamin: 'lisdexamfetamin',
    Dexamfetamin: 'dexamfetamin',
    Atomoxetin: 'atomoxetin',
    Guanfacin: 'guanfacin',
};

const meds = JSON.parse(readFileSync('data/medications.json', 'utf8'));

for (const m of meds) {
    // substanceId nachtragen, falls fehlt (ADHS-Bestand).
    if (!m.substanceId) {
        const wirkstoff = m.ingredient?.[0]?.itemCodeableConcept?.text;
        if (BY_SUBSTANCE[wirkstoff]) m.substanceId = BY_SUBSTANCE[wirkstoff];
    }
    // Guanfacin-ATC korrigieren (nur Attribut, aber fachlich richtig).
    if (m.substanceId === 'guanfacin' && m.code?.coding?.[0]) {
        m.code.coding[0].code = 'N06BA21';
    }
    // btmStatus aus btmCategory ableiten, falls fehlt.
    if (!m.btmStatus) {
        m.btmStatus = m.btmCategory === 'BTM' ? 'btm' : 'kein_btm';
    }
    // btmCategory aus btmStatus konsistent halten.
    m.btmCategory = m.btmStatus === 'btm' ? 'BTM' : 'Nicht-BTM';
}

writeFileSync('data/medications.json', JSON.stringify(meds, null, 2) + '\n');
const missing = meds.filter((m) => !m.substanceId).map((m) => m.id);
console.log(`Migriert. Ohne substanceId: ${missing.length ? missing.join(', ') : 'keine'}.`);
