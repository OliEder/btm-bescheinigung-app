// Leichte Obfuskierung (KEIN Krypto): Unicode-sicheres Base64 + Byte-Shift.
// Nur Sichtschutz gegen zufaelliges Auslesen von sessionStorage/Export-Datei.

const SHIFT = 7;

function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach((b) => { binary += String.fromCharCode((b + SHIFT) & 0xff); });
    return btoa(binary);
}

function base64ToUtf8(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = (binary.charCodeAt(i) - SHIFT) & 0xff;
    }
    return new TextDecoder().decode(bytes);
}

export function obfuscate(plainString) {
    return utf8ToBase64(plainString);
}

export function deobfuscate(packedString) {
    return base64ToUtf8(packedString);
}
