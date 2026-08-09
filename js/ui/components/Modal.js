import { el } from '../dom.js';
import { button } from './Button.js';

export function openModal({ title, body, actions = [], dismissible = true, onClose } = {}) {
  const prevFocus = document.activeElement;
  const titleEl = title ? el('h2', { class: 'rb-modal__title', id: 'rb-modal-title' }, [String(title)]) : null;
  const bodyEl = el('div', { class: 'rb-modal__body' });
  for (const c of [].concat(body || [])) {
    if (c == null) continue;
    bodyEl.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  const dialogChildren = [];
  if (titleEl) dialogChildren.push(titleEl);
  dialogChildren.push(bodyEl);
  if (actions && actions.length) dialogChildren.push(el('div', { class: 'rb-modal__actions' }, actions));
  const dialog = el('div', {
    class: 'rb-modal', role: 'dialog', 'aria-modal': 'true', tabindex: '-1',
    ...(titleEl ? { 'aria-labelledby': 'rb-modal-title' } : { 'aria-label': String(title || 'Dialog') }),
  }, dialogChildren);
  const backdrop = el('div', { class: 'rb-modal__backdrop' }, [dialog]);

  function close() {
    document.removeEventListener('keydown', onKey);
    if (backdrop.parentNode) backdrop.remove();
    if (prevFocus && prevFocus.focus) prevFocus.focus();
    if (onClose) onClose();
  }
  function onKey(e) {
    if (e.key === 'Escape' && dismissible) { close(); }
    else if (e.key === 'Tab') {
      const focusable = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) { e.preventDefault(); dialog.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  if (dismissible) backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(backdrop);
  const firstBtn = dialog.querySelector('button');
  (firstBtn || dialog).focus();
  return { close, element: dialog };
}

export function confirmModal({ title, message, confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen', tone = 'primary' } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (val) => { if (done) return; done = true; modal.close(); resolve(val); };
    const cancelBtn = button({ label: cancelLabel, variant: 'secondary', onClick: () => finish(false) });
    const okBtn = button({ label: confirmLabel, variant: tone === 'danger' ? 'danger' : 'primary', onClick: () => finish(true) });
    const modal = openModal({
      title, body: el('p', {}, [String(message || '')]), actions: [cancelBtn, okBtn],
      onClose: () => { if (!done) { done = true; resolve(false); } },
    });
  });
}

export function chooseModal({ title, items = [], renderItem = (x) => String(x) } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (val) => { if (done) return; done = true; modal.close(); resolve(val); };
    const listEl = el('ul', { class: 'rb-modal__list' });
    items.forEach((it) => {
      const row = el('button', { class: 'rb-modal__item', type: 'button' }, [String(renderItem(it))]);
      row.addEventListener('click', () => finish(it));
      listEl.appendChild(el('li', {}, [row]));
    });
    const cancelBtn = button({ label: 'Abbrechen', variant: 'secondary', onClick: () => finish(null) });
    const modal = openModal({
      title, body: listEl, actions: [cancelBtn],
      onClose: () => { if (!done) { done = true; resolve(null); } },
    });
  });
}
