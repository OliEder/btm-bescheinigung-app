import { el, clear } from './dom.js';
import { icon } from './Icon.js';
import { button } from './components/Button.js';
import { card } from './components/Card.js';
import { alert } from './components/Alert.js';

// App-Shell: Header + Schritt-Tabs + <main> + Footer. DOM via dom.js.
// setContent akzeptiert einen Node (bevorzugt) ODER einen HTML-String
// (Übergangs-Kompromiss: bestehende View-render()-Strings; Umstellung auf
// Nodes in TP-D/E). Der String-Pfad ist die EINZIGE Stelle mit HTML-Injektion.

export class AppShell {
  constructor({ steps, onNavigate, onGenerate, onNext } = {}) {
    this.steps = steps || [];
    this.inputSteps = this.steps.filter((s) => !s.utility);
    this.onNavigate = onNavigate || (() => {});
    this.onGenerate = onGenerate || (() => {});
    this.onNext = onNext || null;
    this._navigating = false;
    this.active = this.inputSteps[0] ? this.inputSteps[0].id : null;
    this.status = {};
    this.tabButtons = new Map();
  }

  mount(root) {
    this.root = root;
    clear(root);
    this.headerTitle = el('h1', { class: 'shell-header__title' }, ['']);
    this.headerMeta = el('span', { class: 'shell-header__meta' }, ['']);
    this.headerIcon = el('span', { class: 'shell-header__icon' });
    const header = el('header', { class: 'shell-header' }, [
      el('div', { class: 'shell-header__brand' }, [
        el('span', { class: 'shell-header__logo' }, ['Reisebescheinigung Generator']),
      ]),
      el('div', { class: 'shell-header__row' }, [
        el('div', { class: 'shell-header__titlewrap' }, [this.headerIcon, this.headerTitle]),
        this.headerMeta,
      ]),
    ]);
    this.tablist = el('div', { class: 'shell-tabs', role: 'tablist', 'aria-label': 'Bereiche' });
    this._renderTabs();
    this.main = el('main', { class: 'shell-main', id: 'main-content' });
    this.footer = this._buildFooter();
    root.appendChild(el('div', { class: 'shell' }, [header, this.tablist, this.main, this.footer]));
    this.setActive(this.active);
  }

  _renderTabs() {
    clear(this.tablist);
    this.tabButtons.clear();
    this.steps.forEach((step) => {
      const stepIndex = step.utility ? null : this.inputSteps.findIndex((s) => s.id === step.id);
      // aria-label traegt den vollen Schrittnamen (+ Position), damit das Label
      // fuer Screenreader erhalten bleibt, wenn es mobil visuell ausgeblendet ist.
      const ariaLabel = step.utility
        ? String(step.label)
        : `${step.label}, Schritt ${stepIndex + 1} von ${this.inputSteps.length}`;
      const btn = el('button', {
        class: 'shell-tab' + (step.utility ? ' shell-tab--utility' : ''),
        role: 'tab', 'data-step': step.id, tabindex: '-1', 'aria-selected': 'false',
        'aria-label': ariaLabel,
      });
      const badge = el('span', { class: 'shell-tab__badge', 'aria-hidden': 'true' });
      if (step.utility) badge.appendChild(icon(step.icon, { size: 14 }));
      else badge.appendChild(el('span', {}, [String(stepIndex + 1)]));
      btn.appendChild(badge);
      btn.appendChild(el('span', { class: 'shell-tab__label' }, [String(step.label)]));
      btn.addEventListener('click', () => this.onNavigate(step.id));
      btn.addEventListener('keydown', (e) => this._onTabKey(e, step.id));
      if (step.utility) this.tablist.appendChild(el('div', { class: 'shell-tabs__spacer' }));
      this.tablist.appendChild(btn);
      this.tabButtons.set(step.id, { btn, badge, stepIndex });
    });
  }

  _onTabKey(e, stepId) {
    const order = this.steps.map((s) => s.id);
    const idx = order.indexOf(stepId);
    let next = null;
    if (e.key === 'ArrowRight') next = order[(idx + 1) % order.length];
    else if (e.key === 'ArrowLeft') next = order[(idx - 1 + order.length) % order.length];
    else if (e.key === 'Home') next = order[0];
    else if (e.key === 'End') next = order[order.length - 1];
    if (next) {
      e.preventDefault();
      // WAI-ARIA roving tabindex: Fokus dem neuen Tab folgen lassen.
      const target = this.tabButtons.get(next);
      if (target && target.btn) target.btn.focus();
      this.onNavigate(next);
    }
  }

  _buildFooter() {
    this.backBtn = el('button', {
      class: 'shell-footer__btn shell-footer__btn--back', 'data-role': 'back', type: 'button',
    }, [icon('arrow-left', { size: 16 }), el('span', {}, ['Zurück'])]);
    this._nextLabel = el('span', {}, ['Weiter']);
    this._nextIcon = el('span', {}, [icon('arrow-right', { size: 16 })]);
    this.nextBtn = el('button', {
      class: 'shell-footer__btn shell-footer__btn--next', 'data-role': 'next', type: 'button',
    }, [this._nextLabel, this._nextIcon]);
    this.backBtn.addEventListener('click', () => this._go(-1));
    this.nextBtn.addEventListener('click', () => this._go(1));
    return el('footer', { class: 'shell-footer' }, [this.backBtn, this.nextBtn]);
  }

  _go(delta) {
    const idx = this.inputSteps.findIndex((s) => s.id === this.active);
    if (idx === -1) return;
    if (delta < 0) {
      const prev = idx - 1;
      if (prev >= 0) this.onNavigate(this.inputSteps[prev].id);
      return;
    }
    const proceed = () => {
      const isLast = this.active === 'travel';
      if (isLast) { this.onGenerate(); this.onNavigate('certificates'); return; }
      const nextIdx = idx + 1;
      if (nextIdx < this.inputSteps.length) this.onNavigate(this.inputSteps[nextIdx].id);
    };
    if (!this.onNext) { proceed(); return; }
    if (this._navigating) return;
    this._navigating = true;
    Promise.resolve(this.onNext(this.active))
      .then((res) => { if (res && res.ok) proceed(); })
      .finally(() => { this._navigating = false; });
  }

  setActive(stepId) {
    const known = this.steps.some((s) => s.id === stepId);
    this.active = known ? stepId : (this.inputSteps[0] && this.inputSteps[0].id);
    for (const [id, { btn }] of this.tabButtons) {
      const sel = id === this.active;
      btn.setAttribute('aria-selected', sel ? 'true' : 'false');
      btn.setAttribute('tabindex', sel ? '0' : '-1');
      btn.classList.toggle('shell-tab--active', sel);
    }
    this._updateHeader();
    this._updateFooter();
  }

  _updateHeader() {
    const step = this.steps.find((s) => s.id === this.active);
    clear(this.headerIcon);
    if (step) this.headerIcon.appendChild(icon(step.icon, { size: 24, color: 'var(--color-primary-700)' }));
    this.headerTitle.textContent = step ? step.label : '';
    if (step && step.utility) {
      this.headerMeta.textContent = 'Verwaltung';
    } else {
      const idx = this.inputSteps.findIndex((s) => s.id === this.active);
      const done = this.inputSteps.filter((s) => this.status[s.id] === 'done').length;
      this.headerMeta.textContent = `Schritt ${idx + 1} von ${this.inputSteps.length} · ${done} abgeschlossen`;
    }
  }

  _updateFooter() {
    const step = this.steps.find((s) => s.id === this.active);
    const isUtility = !!(step && step.utility);
    this.footer.style.display = isUtility ? 'none' : '';
    const idx = this.inputSteps.findIndex((s) => s.id === this.active);
    this.backBtn.disabled = idx <= 0;
    const isLast = this.active === 'travel';
    // Auf dem letzten Eingabeschritt (certificates) gibt es kein "Weiter" mehr
    // -> deaktivieren statt eines wirkungslosen Buttons.
    const isFinal = idx === this.inputSteps.length - 1;
    this.nextBtn.disabled = isFinal;
    this.nextBtn.style.visibility = isFinal ? 'hidden' : '';
    this._nextLabel.textContent = isLast ? 'Bescheinigungen generieren' : 'Weiter';
    clear(this._nextIcon);
    this._nextIcon.appendChild(icon(isLast ? 'file-cog' : 'arrow-right', { size: 16 }));
  }

  setStatus(statusMap) {
    this.status = statusMap || {};
    for (const [id, { badge, btn, stepIndex }] of this.tabButtons) {
      if (stepIndex == null) continue;
      const st = this.status[id];
      clear(badge);
      if (st === 'done') {
        badge.appendChild(icon('check', { size: 12, color: 'var(--color-primary-700)' }));
      } else {
        badge.appendChild(el('span', {}, [String(stepIndex + 1)]));
      }
      const existingDot = btn.querySelector('.shell-tab__dot');
      if (st === 'attention' && !existingDot) {
        btn.appendChild(el('span', {
          class: 'shell-tab__dot', 'aria-label': 'Angaben unvollständig', title: 'Angaben unvollständig',
        }));
      } else if (st !== 'attention' && existingDot) {
        existingDot.remove();
      }
    }
    this._updateHeader();
  }

  showStart({ hasSession = false, onContinue, onImport, onNew } = {}) {
    this.tablist.style.display = 'none';
    this.footer.style.display = 'none';
    const actions = [];
    if (hasSession) actions.push(button({ label: 'Laufende Sitzung fortsetzen', variant: 'primary', onClick: () => onContinue && onContinue() }));
    actions.push(button({ label: 'Gespeicherte Datei laden', variant: 'secondary', icon: 'folder-open', onClick: () => onImport && onImport() }));
    actions.push(button({ label: 'Neu anfangen', variant: 'secondary', onClick: () => onNew && onNew() }));
    const body = el('div', { class: 'shell-start' }, [
      alert({ tone: 'info', children: 'Möchten Sie eine gespeicherte Datei laden oder neu beginnen?' }),
      el('div', { class: 'shell-start__actions' }, actions),
    ]);
    const startCard = card({ title: 'Willkommen', children: body });
    clear(this.main);
    this.main.appendChild(startCard);
    clear(this.headerIcon);
    this.headerTitle.textContent = 'Willkommen';
    this.headerMeta.textContent = '';
  }

  hideStart() {
    this.tablist.style.display = '';
    this.footer.style.display = '';
  }

  setContent(htmlOrNode) {
    clear(this.main);
    if (htmlOrNode == null) return;
    if (htmlOrNode instanceof Node) { this.main.appendChild(htmlOrNode); return; }
    const tpl = document.createElement('template');
    const PROP = 'inner' + 'HTML';
    tpl[PROP] = String(htmlOrNode);
    this.main.appendChild(tpl.content);
  }
}
