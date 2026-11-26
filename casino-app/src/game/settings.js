// Spieler-Einstellungen (pro Gerät im Browser gespeichert)
import { setNumberFormat } from './economy';

const KEY = 'mogul_settings';
const DEFAULTS = { sfx: 0.8, music: 0.4, vibrate: true, lowFx: false, numbers: 'de', fieldHelpers: true };
let current = { ...DEFAULTS };
try {
  const raw = JSON.parse(localStorage.getItem(KEY));
  if (raw && typeof raw === 'object') current = { ...DEFAULTS, ...raw };
  // Altes „Ton aus“ übernehmen
  if (localStorage.getItem('mogul_muted') === '1' && !raw) current.sfx = 0;
} catch {}
setNumberFormat(current.numbers);

const listeners = new Set();
export const getSettings = () => current;
export const updateSettings = (patch) => {
  current = { ...current, ...patch };
  setNumberFormat(current.numbers);
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch {}
  listeners.forEach(fn => fn(current));
};
export const onSettings = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
