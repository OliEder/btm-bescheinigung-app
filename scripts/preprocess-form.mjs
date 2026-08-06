// Einmaliges Skript: inspiziert/bereinigt das amtliche AcroForm-PDF.
//  - Merged zusammengesetzte Feldpaare (Staatsangehoer+gkeit, Wohnanschr+ft) zu
//    je einem Feld ueber die volle Zeilenbreite.
//  - Repariert die Widgets: setzt fehlendes /P (Page-Ref) und baut die Page-Annots
//    exakt aus den verbliebenen Feldern neu auf, damit form.flatten() funktioniert.
// Aufruf:
//   node scripts/preprocess-form.mjs --inspect   (nur Feldliste ausgeben)
//   node scripts/preprocess-form.mjs --merge      (Feldpaare mergen)
//   node scripts/preprocess-form.mjs --repair     (Widgets/Annots reparieren)
// Ohne Argument: --merge und --repair nacheinander.
import { readFileSync, writeFileSync } from 'node:fs';
import { PDFDocument, PDFName, PDFString } from 'pdf-lib';

const SRC = 'assets/reise-scheng-formular.pdf';

async function load() {
    return PDFDocument.load(new Uint8Array(readFileSync(SRC)));
}

async function inspect() {
    const doc = await load();
    const fields = doc.getForm().getFields();
    fields.forEach((f) => console.log(`${f.constructor.name}: "${f.getName()}"`));
    console.log(`\n${fields.length} Felder.`);
}

function mergePair(form, doc, leftName, rightName, targetName) {
    const left = form.getTextField(leftName);
    const right = form.getTextField(rightName);
    const [lw] = left.acroField.getWidgets();
    const [rw] = right.acroField.getWidgets();
    const lr = lw.getRectangle();
    const rr = rw.getRectangle();
    lw.setRectangle({ x: lr.x, y: lr.y, width: (rr.x + rr.width) - lr.x, height: lr.height });
    left.acroField.dict.set(PDFName.of('T'), PDFString.of(targetName));

    // Rechtes Feld aus dem AcroForm-Feldbaum entfernen.
    const fieldsArr = form.acroForm.Fields();
    for (let i = fieldsArr.size() - 1; i >= 0; i--) {
        if (fieldsArr.get(i) === right.ref) fieldsArr.remove(i);
    }
}

// Setzt /P auf jedes verbliebene Feld-Widget und baut die Page-Annots neu auf.
function repair(doc) {
    const form = doc.getForm();
    const fieldsArr = form.acroForm.Fields();
    const page0 = doc.getPages()[0];
    const pageRef = page0.ref;
    const fieldRefs = [];
    for (let i = 0; i < fieldsArr.size(); i++) fieldRefs.push(fieldsArr.get(i));
    for (const ref of fieldRefs) {
        const dict = doc.context.lookup(ref);
        if (dict && dict.set) dict.set(PDFName.of('P'), pageRef);
    }
    page0.node.set(PDFName.of('Annots'), doc.context.obj(fieldRefs));
}

async function run({ doMerge, doRepair }) {
    const doc = await load();
    const form = doc.getForm();
    if (doMerge) {
        mergePair(form, doc, 'Staatsangehör', 'gkeit', 'Staatsangehoerigkeit');
        mergePair(form, doc, 'Wohnanschr', 'ft', 'Wohnanschrift');
    }
    if (doRepair) repair(doc);
    writeFileSync(SRC, await doc.save());
    console.log(`Gespeichert (merge=${doMerge}, repair=${doRepair}).`);
}

const args = process.argv.slice(2);
if (args.includes('--inspect')) {
    inspect().catch((e) => { console.error(e); process.exit(1); });
} else {
    const doMerge = args.length === 0 || args.includes('--merge');
    const doRepair = args.length === 0 || args.includes('--repair');
    run({ doMerge, doRepair }).catch((e) => { console.error(e); process.exit(1); });
}
