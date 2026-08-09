import { ICON_DATA } from './icon-data.js';

// Baut ein inline-<svg> aus den gespeicherten Lucide-Pfaden. Kein dynamisches HTML:
// der gespeicherte Markup wird per DOMParser (SVG-Namespace) zu echten Knoten
// geparst und angehängt. Lucide-SVGs nutzen stroke="currentColor", deshalb genügt
// die color-Eigenschaft am Wrapper zum Umfärben.
const SVG_NS = 'http://www.w3.org/2000/svg';

function buildSvg(inner, size) {
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="${SVG_NS}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`,
    'image/svg+xml'
  );
  return doc.documentElement;
}

export function icon(name, opts = {}) {
  const { size = 20, color = 'currentColor', label } = opts;
  const span = document.createElement('span');
  span.style.display = 'inline-flex';
  span.style.width = `${size}px`;
  span.style.height = `${size}px`;
  span.style.flexShrink = '0';
  span.style.color = color;
  if (label) {
    span.setAttribute('role', 'img');
    span.setAttribute('aria-label', label);
  } else {
    span.setAttribute('aria-hidden', 'true');
  }
  const inner = ICON_DATA[name];
  if (inner) span.appendChild(buildSvg(inner, size));
  return span;
}
