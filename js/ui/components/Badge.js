import { el } from '../dom.js';
const TONES = ['neutral', 'primary', 'success', 'warning', 'danger'];
export function badge({ tone = 'neutral', text = '' } = {}) {
  const t = TONES.includes(tone) ? tone : 'neutral';
  return el('span', { class: `rb-badge rb-badge--${t}` }, [String(text)]);
}
