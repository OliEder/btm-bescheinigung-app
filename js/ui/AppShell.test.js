import { describe, it, expect, vi } from 'vitest';
import { AppShell } from './AppShell.js';

const STEPS = [
  { id: 'patient', label: 'Patient', icon: 'user' },
  { id: 'doctor', label: 'Arzt', icon: 'stethoscope' },
  { id: 'medication', label: 'Medikamente', icon: 'pill' },
  { id: 'travel', label: 'Reisedaten', icon: 'plane' },
  { id: 'certificates', label: 'Formulare', icon: 'file-text' },
  { id: 'data', label: 'Gespeicherte Daten', icon: 'database', utility: true },
];

function makeShell(opts = {}) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const onNavigate = opts.onNavigate || vi.fn();
  const onGenerate = opts.onGenerate || vi.fn();
  const shell = new AppShell({ steps: STEPS, onNavigate, onGenerate });
  shell.mount(root);
  return { shell, root, onNavigate, onGenerate };
}

describe('AppShell.mount', () => {
  it('erzeugt Header, Tabs (6 Buttons) und main#main-content und Footer', () => {
    const { root } = makeShell();
    expect(root.querySelector('header')).not.toBeNull();
    expect(root.querySelectorAll('[role=tab]').length).toBe(6);
    expect(root.querySelector('#main-content')).not.toBeNull();
    expect(root.querySelector('footer')).not.toBeNull();
  });
});

describe('AppShell.setActive', () => {
  it('markiert den aktiven Tab und setzt den Header-Titel', () => {
    const { shell, root } = makeShell();
    shell.setActive('doctor');
    const active = root.querySelector('[role=tab][aria-selected=true]');
    expect(active.textContent).toContain('Arzt');
    expect(root.querySelector('header').textContent).toContain('Arzt');
  });
});

describe('AppShell.setStatus', () => {
  it('done → Haken-Badge (svg), attention → Aufmerksamkeits-Punkt', () => {
    const { shell, root } = makeShell();
    shell.setStatus({ patient: 'done', doctor: 'attention', medication: 'todo', travel: 'todo', certificates: 'todo' });
    const patientTab = root.querySelector('[role=tab][data-step=patient]');
    const doctorTab = root.querySelector('[role=tab][data-step=doctor]');
    expect(patientTab.querySelector('svg')).not.toBeNull();
    expect(doctorTab.querySelector('[aria-label="Angaben unvollständig"]')).not.toBeNull();
  });
  it('Header zählt abgeschlossene Schritte', () => {
    const { shell, root } = makeShell();
    shell.setActive('patient');
    shell.setStatus({ patient: 'done', doctor: 'done', medication: 'todo', travel: 'todo', certificates: 'todo' });
    expect(root.querySelector('header').textContent).toContain('2 abgeschlossen');
  });
});

describe('AppShell Navigation', () => {
  it('Klick auf einen Tab feuert onNavigate', () => {
    const { root, onNavigate } = makeShell();
    root.querySelector('[role=tab][data-step=travel]').click();
    expect(onNavigate).toHaveBeenCalledWith('travel');
  });
  it('Footer Weiter navigiert zum nächsten Schritt', () => {
    const { shell, root, onNavigate } = makeShell();
    shell.setActive('patient');
    root.querySelector('[data-role=next]').click();
    expect(onNavigate).toHaveBeenCalledWith('doctor');
  });
  it('Weiter im travel-Schritt ruft onGenerate und navigiert zu certificates', () => {
    const { shell, root, onNavigate, onGenerate } = makeShell();
    shell.setActive('travel');
    root.querySelector('[data-role=next]').click();
    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('certificates');
  });
  it('ArrowRight auf aktivem Tab bewegt die Auswahl (roving) und feuert onNavigate', () => {
    const { shell, root, onNavigate } = makeShell();
    shell.setActive('patient');
    const patientTab = root.querySelector('[role=tab][data-step=patient]');
    patientTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(onNavigate).toHaveBeenCalledWith('doctor');
  });
});

describe('AppShell.setContent', () => {
  it('Node wird in #main-content eingehängt', () => {
    const { shell, root } = makeShell();
    const node = document.createElement('p'); node.textContent = 'X';
    shell.setContent(node);
    expect(root.querySelector('#main-content').textContent).toContain('X');
  });
  it('String (View-render) wird eingehängt', () => {
    const { shell, root } = makeShell();
    shell.setContent('<form id="patient-form"></form>');
    expect(root.querySelector('#patient-form')).not.toBeNull();
  });
});

describe('AppShell.showStart', () => {
  it('zeigt Willkommen + Neu anfangen; onNew/onImport feuern; kein Fortsetzen ohne Session', () => {
    const root = document.createElement('div'); document.body.appendChild(root);
    const shell = new AppShell({ steps: STEPS, onNavigate: vi.fn(), onGenerate: vi.fn() });
    shell.mount(root);
    const onNew = vi.fn(); const onImport = vi.fn(); const onContinue = vi.fn();
    shell.showStart({ hasSession: false, onNew, onImport, onContinue });
    expect(root.textContent).toContain('Willkommen');
    const newBtn = [...root.querySelectorAll('button')].find((b) => /Neu anfangen/.test(b.textContent));
    expect(newBtn).toBeTruthy();
    newBtn.click();
    expect(onNew).toHaveBeenCalledTimes(1);
    const importBtn = [...root.querySelectorAll('button')].find((b) => /laden/i.test(b.textContent));
    importBtn.click();
    expect(onImport).toHaveBeenCalledTimes(1);
    expect([...root.querySelectorAll('button')].some((b) => /fortsetzen/i.test(b.textContent))).toBe(false);
  });
  it('mit Session: Fortsetzen-Button vorhanden und ruft onContinue', () => {
    const root = document.createElement('div'); document.body.appendChild(root);
    const shell = new AppShell({ steps: STEPS, onNavigate: vi.fn(), onGenerate: vi.fn() });
    shell.mount(root);
    const onContinue = vi.fn();
    shell.showStart({ hasSession: true, onNew: vi.fn(), onImport: vi.fn(), onContinue });
    const cont = [...root.querySelectorAll('button')].find((b) => /fortsetzen/i.test(b.textContent));
    expect(cont).toBeTruthy();
    cont.click();
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
