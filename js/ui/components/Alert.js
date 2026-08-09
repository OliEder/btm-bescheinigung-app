import { el } from '../dom.js';
import { icon } from '../Icon.js';

const TONES = { info: 'info', success: 'check-circle-2', warning: 'triangle-alert', danger: 'circle-x' };

export function alert({ tone = 'info', children } = {}) {
  const t = TONES[tone] ? tone : 'info';
  const role = (t === 'danger' || t === 'warning') ? 'alert' : 'status';
  const body = el('div', { class: 'rb-alert__body' });
  for (const c of [].concat(children)) {
    if (c == null) continue;
    body.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el('div', { class: `rb-alert rb-alert--${t}`, role }, [
    icon(TONES[t], { size: 18, color: 'currentColor' }),
    body,
  ]);
}
