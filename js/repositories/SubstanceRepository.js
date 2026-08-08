// Kapselt den Zugriff auf die zentrale Wirkstoff-Tabelle (substances.json).
// Schluessel ist eine stabile substanceId (nicht der ATC, da ein Wirkstoff
// mehrere ATC-Codes haben kann).

export class SubstanceRepository {
    constructor(substances) {
        this.substances = substances || {};
    }

    findById(substanceId) {
        return this.substances[substanceId] || null;
    }

    indicationsFor(substanceId) {
        return this.substances[substanceId]?.indications || [];
    }
}
