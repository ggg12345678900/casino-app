// Synthesizer-Soundeffekte, Hintergrundmusik und Vibration – alles ohne Audiodateien.
import { getSettings, onSettings } from './settings';

let ctx = null;
let sfxBus = null;
let musicBus = null;

const ac = () => {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      sfxBus = ctx.createGain(); sfxBus.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.connect(ctx.destination);
      applyVolumes(getSettings());
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
};

function applyVolumes(s) {
  if (!ctx) return;
  sfxBus.gain.setTargetAtTime(s.sfx, ctx.currentTime, 0.05);
  musicBus.gain.setTargetAtTime(s.music * 0.5, ctx.currentTime, 0.2);
}
onSettings((s) => { applyVolumes(s); if (s.music > 0) music.start(); else music.stop(); });

const tone = (freq, { at = 0, dur = 0.12, type = 'sine', vol = 0.18, slide = 0, bus } = {}) => {
  if (!bus && getSettings().sfx <= 0) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus || sfxBus);
  o.start(t);
  o.stop(t + dur + 0.02);
};

// Vibration am Handy (wo der Browser es kann)
export const haptic = (pattern = 10) => {
  if (!getSettings().vibrate) return;
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {}
};

export const sfx = {
  // Münze: zwei helle Töne, steigen mit der Combo
  coin: (combo = 0) => {
    haptic(8);
    const base = 880 * Math.pow(1.03, Math.min(combo, 20));
    tone(base, { dur: 0.07, type: 'square', vol: 0.06 });
    tone(base * 1.5, { at: 0.05, dur: 0.12, type: 'square', vol: 0.06 });
  },
  gold: () => { haptic([20, 30, 20]); [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, { at: i * 0.06, dur: 0.18, type: 'triangle', vol: 0.12 })); },
  charm: () => { haptic([30, 40, 30]); [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, { at: i * 0.08, dur: 0.3, type: 'sine', vol: 0.14 })); },
  buy: () => { haptic(12); tone(1318, { dur: 0.06, type: 'square', vol: 0.05 }); tone(1760, { at: 0.06, dur: 0.18, type: 'square', vol: 0.05 }); },
  nope: () => tone(160, { dur: 0.15, type: 'sawtooth', vol: 0.05, slide: 0.7 }),
  levelUp: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, { at: i * 0.07, dur: 0.16, type: 'triangle', vol: 0.1 })),
  achievement: () => { haptic(25); [659, 784, 988, 1318].forEach((f, i) => tone(f, { at: i * 0.09, dur: 0.25, type: 'square', vol: 0.06 })); },
  sack: () => { tone(300, { dur: 0.25, type: 'sawtooth', vol: 0.06, slide: 3 }); },
  tick: () => tone(1200, { dur: 0.025, type: 'square', vol: 0.04 }),
  win: () => { haptic(20); [784, 1046].forEach((f, i) => tone(f, { at: i * 0.08, dur: 0.15, type: 'triangle', vol: 0.1 })); },
  bigWin: () => { haptic([60, 40, 60, 40, 120]); [523, 659, 784, 1046, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, { at: i * 0.09, dur: 0.22, type: 'square', vol: 0.07 })); },
  firework: () => { [0, 0.35, 0.7, 1.1].forEach((at, i) => { tone(180 + i * 40, { at, dur: 0.18, type: 'sawtooth', vol: 0.05, slide: 4 }); tone(1600 + i * 200, { at: at + 0.18, dur: 0.25, type: 'triangle', vol: 0.06, slide: 0.5 }); }); },
  move: () => { haptic([40, 30, 80]); [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, { at: i * 0.1, dur: 0.3, type: 'triangle', vol: 0.12 })); },
  click: () => tone(900, { dur: 0.03, type: 'square', vol: 0.03 }),
};

// ─── Hintergrundmusik: entspannter Lounge-Loop (Akkorde, Bass, Arpeggio) ──
const BPM = 92;
const STEP = 60 / BPM / 2; // Achtelnoten
// Am7 – Dm7 – G7 – Cmaj7 (jeder Akkord 8 Achtel)
const CHORDS = [
  { bass: 110.0, notes: [220.0, 261.63, 329.63, 392.0] },
  { bass: 146.83, notes: [220.0, 261.63, 293.66, 349.23] },
  { bass: 98.0, notes: [196.0, 246.94, 293.66, 349.23] },
  { bass: 130.81, notes: [196.0, 246.94, 329.63, 392.0] },
];
const ARP = [0, 2, 1, 3, 2, 1, 3, 2];
export const music = (() => {
  let timer = null;
  let step = 0;
  let nextTime = 0;
  const schedule = () => {
    const a = ctx;
    const bus = musicBus;
    while (nextTime < a.currentTime + 0.4) {
      const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
      const at = nextTime - a.currentTime;
      const i = step % 8;
      if (i === 0) {
        chord.notes.forEach(f => tone(f, { at, dur: STEP * 7.5, type: 'sine', vol: 0.035, bus }));
        tone(chord.bass, { at, dur: STEP * 3, type: 'triangle', vol: 0.12, bus });
      }
      if (i === 4) tone(chord.bass * 1.5, { at, dur: STEP * 2.5, type: 'triangle', vol: 0.08, bus });
      if (i % 2 === 1 || Math.floor(step / 32) % 2 === 1) tone(chord.notes[ARP[i]] * 2, { at, dur: STEP * 0.9, type: 'triangle', vol: 0.025, bus });
      if (i === 2 || i === 6) tone(6000, { at, dur: 0.03, type: 'square', vol: 0.006, bus });
      nextTime += STEP;
      step++;
    }
  };
  return {
    start() {
      if (timer || getSettings().music <= 0) return;
      const a = ac();
      if (!a) return;
      nextTime = a.currentTime + 0.1;
      timer = setInterval(schedule, 120);
    },
    stop() { if (timer) { clearInterval(timer); timer = null; } },
  };
})();
// Musik pausieren, wenn der Tab im Hintergrund ist
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') music.stop();
    else if (ctx) music.start();
  });
}

// Kompatibilität mit älterem Code
export const isMuted = () => getSettings().sfx <= 0;
