// Kapselt den Zugriff auf die Medikamenten-Flatfile (FHIR-Medication).
// Interface: findAll(), findById(id), search(query).
// Ein spaeterer PZN-API-Adapter muesste nur dieses Interface erfuellen.

export class MedicationRepository {
    constructor(resources) {
        this.resources = resources || [];
    }

    findAll() {
        return this.resources;
    }

    findById(id) {
        return this.resources.find((r) => r.id === id) || null;
    }

    /**
     * Sucht ueber productFamily / code.text / Wirkstoff und gruppiert nach
     * productFamily. Rueckgabe: [{ productFamily, form, substance, strengths: [...] }].
     */
    search(query) {
        const q = String(query).toLowerCase().trim();
        const matches = this.resources.filter((r) => {
            const substance = r.ingredient?.[0]?.itemCodeableConcept?.text || '';
            return (
                (r.productFamily || '').toLowerCase().includes(q) ||
                (r.code?.text || '').toLowerCase().includes(q) ||
                substance.toLowerCase().includes(q)
            );
        });
        return this._groupByFamily(matches);
    }

    _groupByFamily(resources) {
        const map = new Map();
        resources.forEach((r) => {
            const key = r.productFamily || r.code?.text || r.id;
            const strength = r.ingredient?.[0]?.strength?.numerator || {};
            if (!map.has(key)) {
                map.set(key, {
                    productFamily: r.productFamily || key,
                    form: r.form?.text || '',
                    substance: r.ingredient?.[0]?.itemCodeableConcept?.text || '',
                    strengths: [],
                });
            }
            map.get(key).strengths.push({
                refId: r.id,
                concentrationValue: strength.value ?? 0,
                concentrationUnit: strength.unit ?? '',
                btmCategory: r.btmCategory || 'BTM',
            });
        });
        return Array.from(map.values());
    }
}
