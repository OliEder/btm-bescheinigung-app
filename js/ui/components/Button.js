import { el } from '../dom.js';
import { icon } from '../Icon.js';

const VARIANTS = ['primary', 'secondary', 'ghost', 'danger'];
const SIZES = ['sm', 'md', 'lg'];

export function button({ label, variant = 'primary', size = 'md', icon: iconName,
  disabled = false, onClick, type = 'button', ...attrs } = {}) {
  const v = VARIANTS.includes(variant) ? variant : 'primary';
  const s = SIZES.includes(size) ? size : 'md';
  const children = [];
  if (iconName) children.push(icon(iconName, { size: 16, color: 'currentColor' }));
  if (label != null) children.push(el('span', {}, [String(label)]));
  const node = el('button', { class: `rb-btn rb-btn--${v} rb-btn--${s}`, type, ...attrs }, children);
  if (disabled) node.disabled = true;
  if (onClick) node.addEventListener('click', onClick);
  return node;
}
