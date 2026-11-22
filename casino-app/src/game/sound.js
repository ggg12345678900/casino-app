// Kleine Synthesizer-Soundeffekte über die Web Audio API – keine Audiodateien nötig.
let ctx = null;
let muted = (() => { try { return localStorage.getItem('mogul_muted') === '1'; } catch { return false; } })();

const ac = () => {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
};

const tone = (freq, { at = 0, dur = 0.12, type = 'sine', vol = 0.18, slide = 0 } = {}) => {
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
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
};

export const sfx = {
  // Münze: zwei helle Töne, steigen mit der Combo
  coin: (combo = 0) => {
    const base = 880 * Math.pow(1.03, Math.min(combo, 20));
    tone(base, { dur: 0.07, type: 'square', vol: 0.06 });
    tone(base * 1.5, { at: 0.05, dur: 0.12, type: 'square', vol: 0.06 });
  },
  gold: () => [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, { at: i * 0.06, dur: 0.18, type: 'triangle', vol: 0.12 })),
  charm: () => [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, { at: i * 0.08, dur: 0.3, type: 'sine', vol: 0.14 })),
  buy: () => { tone(1318, { dur: 0.06, type: 'square', vol: 0.05 }); tone(1760, { at: 0.06, dur: 0.18, type: 'square', vol: 0.05 }); },
  nope: () => tone(160, { dur: 0.15, type: 'sawtooth', vol: 0.05, slide: 0.7 }),
  levelUp: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, { at: i * 0.07, dur: 0.16, type: 'triangle', vol: 0.1 })),
  achievement: () => [659, 784, 988, 1318].forEach((f, i) => tone(f, { at: i * 0.09, dur: 0.25, type: 'square', vol: 0.06 })),
  sack: () => { tone(300, { dur: 0.25, type: 'sawtooth', vol: 0.06, slide: 3 }); },
  tick: () => tone(1200, { dur: 0.025, type: 'square', vol: 0.04 }),
  win: () => [784, 1046].forEach((f, i) => tone(f, { at: i * 0.08, dur: 0.15, type: 'triangle', vol: 0.1 })),
  bigWin: () => [523, 659, 784, 1046, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, { at: i * 0.09, dur: 0.22, type: 'square', vol: 0.07 })),
  firework: () => { [0, 0.35, 0.7, 1.1].forEach((at, i) => { tone(180 + i * 40, { at, dur: 0.18, type: 'sawtooth', vol: 0.05, slide: 4 }); tone(1600 + i * 200, { at: at + 0.18, dur: 0.25, type: 'triangle', vol: 0.06, slide: 0.5 }); }); },
  move: () => [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, { at: i * 0.1, dur: 0.3, type: 'triangle', vol: 0.12 })),
};

export const isMuted = () => muted;
export const setMuted = (m) => {
  muted = m;
  try { localStorage.setItem('mogul_muted', m ? '1' : '0'); } catch {}
};
