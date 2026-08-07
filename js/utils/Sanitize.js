// Zentrale XSS-Absicherung: Textinhalte escapen, Attribute ueber die DOM-API setzen.

const HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

/**
 * Escaped HTML-Sonderzeichen fuer sichere Interpolation in gerendertes Markup.
 * null/undefined -> "", andere Typen werden zu String konvertiert.
 */
export function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/**
 * Setzt data-* Attribute sicher ueber element.dataset (keine String-Interpolation).
 */
export function setDataset(element, data) {
    Object.entries(data).forEach(([key, val]) => {
        element.dataset[key] = String(val);
    });
}
