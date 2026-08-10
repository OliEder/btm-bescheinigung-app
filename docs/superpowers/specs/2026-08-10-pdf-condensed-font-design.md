# PDF: Condensed-Schrift + einheitliches Font-Sizing für Formularfelder

Bettet **Fira Sans Condensed** (OFL, self-hosted) in alle AcroForm-Felder der
BtM-Bescheinigung ein und ersetzt das reine `setFontSize(0)`-Auto-Scaling durch
ein **kontrolliertes Sizing**: feste Standardgröße 11 pt; passt ein Wert nicht,
schrumpft **nur dieses Feld** bis min 7 pt; erst wenn auch 7 pt nicht reicht,
greift Auto-Scaling (0) als Notnagel. Die condensed Schrift sorgt dafür, dass
deutlich mehr Text bei voller Größe passt, bevor überhaupt geschrumpft wird.

## Kontext & verifizierte Machbarkeit

Spikes (in pdf-lib 1.17.1 + @pdf-lib/fontkit 1.1.1, gegen das echte Template) haben
bestätigt:
- Custom-Font einbetten + auf Felder anwenden + flatten funktioniert
  (`registerFontkit` → `embedFont(bytes,{subset:true})` → `form.updateFieldAppearances(font)` → `form.flatten()`).
- Feldbreite ist auslesbar: `field.acroField.getWidgets()[0].getRectangle().width`.
- Textbreite messbar: `font.widthOfTextAtSize(text, size)`.
- Die Fit-Logik greift wie gewünscht: kurze Werte bleiben 11 pt, mittlere bleiben 11 pt
  (dank condensed), sehr lange fallen auf 0 (Auto) zurück.

## Leitentscheidungen

- **Fira Sans Condensed**, self-hosted unter `assets/fonts/` (+ `OFL.txt`) — passt zur
  „lokal statt CDN"-Linie (TP-A). Als Webpack-Asset gebündelt, zur Laufzeit als Bytes geladen.
- **Alle Formularfelder** der BtM-Bescheinigung bekommen die condensed Schrift (einheitliches
  Schriftbild). Der selbst gezeichnete Medikationsplan bleibt außen vor.
- **Sizing-Modell (jetzt):** feste Standardgröße 11 pt je Feld; bei Overflow dieses Feld
  bis min 7 pt reduzieren; wenn 7 pt nicht reicht → 0 (Auto-Scaling). **Kein** globales
  koordiniertes Runterskalieren aller Felder auf eine gemeinsame Größe — das ist als
  **Nice-to-have für später** notiert (s. u.).
- **Grenzen justierbar:** `STD=11`, `MIN=7` als benannte Konstanten (leicht am Formular
  feinabstimmbar).

## Architektur / Dateien

```
package.json                         @pdf-lib/fontkit als dependency (bereits ergänzt)
assets/fonts/FiraSansCondensed-Regular.ttf   self-hosted (OFL)
assets/fonts/OFL.txt                 Lizenztext (OFL verlangt Mitlieferung)
js/services/PdfFieldFont.js          NEU — fitFontSize(font, text, fieldWidth, opts) -> number
js/services/PdfFieldFont.test.js
js/services/PdfFormFiller.js         MOD — Font einbetten, setField nutzt fitFontSize
js/services/PdfFormFiller.test.js    MOD — Tests für 11/7/0-Verhalten
```

### `js/services/PdfFieldFont.js`

Reine Mess-/Entscheidungsfunktion, DOM-frei, isoliert testbar:
```
export const STD_SIZE = 11;
export const MIN_SIZE = 7;
export function fitFontSize(font, text, fieldWidth, { std = STD_SIZE, min = MIN_SIZE, padding = 4 } = {}) -> number
```
- `avail = fieldWidth - padding` (kleiner Innenabstand, damit Text nicht am Rand klebt).
- Leerer Text → `std` (nichts zu messen).
- `font.widthOfTextAtSize(text, std) <= avail` → **`std`** (11 pt, Standard).
- sonst in 0,5-Schritten von `std` nach `min` heruntergehen; erste Größe, die passt, zurückgeben.
- passt auch `min` nicht → **`0`** (Auto-Scaling-Notnagel).
- `font` muss `widthOfTextAtSize` bereitstellen (pdf-lib `PDFFont`).

### `js/services/PdfFormFiller.js` — Änderungen

1. Oben importieren: `fontkit` (`@pdf-lib/fontkit`), `fitFontSize` (aus PdfFieldFont), sowie
   die Font-Bytes (Webpack-Asset-Import wie beim Template-PDF; im Test via `readFileSync`).
2. In `fillCertificate`: nach `doc.getForm()`:
   ```
   doc.registerFontkit(fontkit);
   const font = await doc.embedFont(firaBytes, { subset: true });
   ```
   und `font` an die Feld-Befüllung weiterreichen.
3. `setField(form, name, value, font)`:
   - `field.setText(String(value ?? ''))`
   - Feldbreite lesen: `const w = field.acroField.getWidgets()[0].getRectangle().width` (mit try;
     falls kein Widget → Fallback Auto 0).
   - `const size = fitFontSize(font, String(value ?? ''), w)`
   - `field.setFontSize(size)` (0 = Auto).
   - `field.updateAppearances(font)` (Feld-Appearance mit condensed Schrift).
4. Nach dem Setzen aller Felder: `form.updateFieldAppearances(font)` (globaler Sync), dann
   `if (flatten) form.flatten()`. Reihenfolge: Werte+Größe je Feld → globaler Appearance-Sync →
   flatten (im Spike bestätigt).

Der bestehende Titel-Fix (`Name = Titel + Nachname`) und der Medikamenten-Vokabular-Fix bleiben
unverändert; nur die Schrift-/Größenlogik in `setField` ändert sich.

## Datenfluss / Integration

`fillCertificate` bleibt **rein** (bekommt Bytes, kein Netz/DOM) — genau wie beim Template.
Die Font-Bytes werden **als Parameter übergeben**, analog zum `templateBytes`-Muster:

- **Signatur:** `fillCertificate(templateBytes, data, fontBytes)` — `fontBytes` optional; fehlt es,
  fällt `setField` auf die bisherige Standardschrift + Auto-Sizing zurück (Abwärtskompatibilität
  für bestehende Aufrufer/Tests, die keine Font-Bytes übergeben). Wird `fontBytes` übergeben,
  greift condensed + kontrolliertes Sizing.
- **`PDFController`** lädt die `.ttf` genau wie das Template: `import fontUrl from '../../assets/FiraSansCondensed-Regular.ttf'`
  → einmal fetchen → `Uint8Array` cachen (`_fontBytes`, analog `_templateBytes`) → an
  `buildCertificateBytes`/`fillCertificate` durchreichen.
- **Webpack** braucht eine neue Regel `{ test: /\.ttf$/i, type: 'asset/resource' }` in
  `webpack.config.js` (aktuell existiert nur eine `.pdf`-Regel; die TP-A-woff2 liefen über CSS
  `url()`, nicht über JS-Import — ein JS-`import` der `.ttf` braucht daher die eigene Regel).
- **Test** übergibt die `.ttf`-Bytes direkt via `readFileSync` (kein Webpack nötig).

## Fehlerbehandlung & Randfälle

- **Feld ohne Widget/Rechteck** → `fitFontSize` nicht anwendbar → Größe 0 (Auto), kein Wurf.
- **Font-Embedding schlägt fehl** (z. B. Datei fehlt) → Fehler wird nicht verschluckt: die
  PDF-Erzeugung soll klar fehlschlagen statt still ohne condensed Schrift weiterzumachen
  (die Schrift ist Teil der Anforderung). Test deckt den Erfolgsfall ab; der Loader wirft bei
  fehlender Datei.
- **Sehr lange Werte** (Name/Anschrift) → 0 (Auto) greift; kombiniert mit condensed passiert das
  seltener als vorher mit Helvetica.
- **Leere Felder** → `std`, aber ohne Text sichtbar irrelevant.
- **Kein `innerHTML`/CDN** — reine PDF-Logik, keine DOM-/Netz-Abhängigkeit.

## Tests (Pflicht, Vitest)

- **`PdfFieldFont.test.js`** (rein, mit einer pdf-lib-Standardfont-Instanz als `font`):
  - kurzer Text, breites Feld → `STD_SIZE` (11).
  - Text, der bei 11 nicht, aber bei z. B. 9 passt → Größe zwischen min und std, `< 11`, `>= 7`.
  - Text, der auch bei 7 nicht passt → `0`.
  - leerer Text → `STD_SIZE`.
  - Grenzen respektiert (nie `< MIN` außer 0; nie `> STD`).
- **`PdfFormFiller.test.js`** (mit echtem Template + eingebetteter Fira):
  - kurzer Arzt-Name → Feld `Name` erhält 11 pt (Default Appearance zeigt `… 11 Tf`).
  - sehr langer Name → Feld erhält 0 (Auto) ODER eine Größe < 11 (je nach Breite) — geprüft, dass
    **nicht** die feste 12 pt aus dem Alt-Zustand steht und der Wert vollständig gesetzt ist.
  - eingebettete Schrift ist Fira: Default Appearance referenziert `/FiraSansCondensed…`.
  - Bestandstests (Titel-Fix, Vokabular-Fix, Formatkorrekturen) bleiben grün; ggf. Größen-
    Assertions von `0 Tf`/`… Tf` an das neue Verhalten anpassen (kurze Testwerte → 11).
- **Bestehende 244 Tests** bleiben grün; `npm run build` kompiliert (Font als Asset gebündelt).

## ARC42 (Pflicht)

`docs/arc42/architecture.md` §8/§9: Absatz „PDF-Schrift": Fira Sans Condensed (OFL) self-hosted,
via fontkit in alle Formularfelder eingebettet; kontrolliertes Sizing (Standard 11 pt, Feld-weise
Reduktion bis 7 pt, dann Auto 0). Notiz: globales koordiniertes Sizing als späteres Nice-to-have.

## Definition of Done

- Fira Sans Condensed + OFL im Repo, als Asset gebündelt, in alle Formularfelder eingebettet.
- `PdfFieldFont.fitFontSize` + Tests; `setField` nutzt es (11 → 7 → 0).
- Alle neuen + bestehenden Unit-Tests grün; `npm run build` kompiliert.
- ARC42 ergänzt.

## Später (Nice-to-have, ausdrücklich NICHT in diesem Umfang)

**Global koordiniertes Sizing:** statt jedes Feld einzeln zu schrumpfen, EINE gemeinsame Größe
für alle Felder wählen (Minimum der Einzel-Fit-Größen, geklemmt auf [MIN, STD]); nur Felder, die
selbst MIN sprengen, dürfen isoliert darunter (0). Ergibt ein maximal einheitliches Schriftbild.
Wird nach den anderen offenen Themen (Mobile/A11y, Screens) umgesetzt.
