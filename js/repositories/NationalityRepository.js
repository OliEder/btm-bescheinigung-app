// Kapselt den Zugriff auf die amtliche Staatsangehörigkeits-Liste (nationalities.json).
export class NationalityRepository {
  constructor(data) {
    this.list = (data && data.list) || [];
  }

  findAll() {
    return this.list;
  }

  // Sucht case-insensitiv in Landesname UND Adjektiv; max. limit Treffer.
  search(term, limit = 8) {
    const q = String(term || '').trim().toLowerCase();
    if (!q) return this.list.slice(0, limit);
    return this.list
      .filter((n) => n.name.toLowerCase().includes(q) || n.adjective.toLowerCase().includes(q))
      .slice(0, limit);
  }
}
