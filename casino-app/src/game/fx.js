// Effekt-Ebene: eine Canvas über dem ganzen Bildschirm für Splitter, Funken, Druckwellen
// und Münzen, die in den Geldzähler fliegen. Läuft nur, solange etwas zu sehen ist.
import { getSettings } from './settings';

// Farben je Münzsorte: [hell, mitte, dunkel]
const PALETTE = {
  copper: ['#f8cfa8', '#c97a43', '#7c3f17'],
  brass: ['#fff5c2', '#e2b93f', '#8f6c12'],
  bimetal: ['#eef1f4', '#c9a23a', '#8a6a14'],
  bimetal2: ['#f5e39c', '#a3acb6', '#6b7480'],
  gold: ['#fffbe0', '#fcd34d', '#b45309'],
  jeton: ['#f3e8ff', '#a855f7', '#4c1d95'],
  charm: ['#fff7d6', '#fbbf24', '#b45309'],
  'chip-red': ['#fecaca', '#dc2626', '#7f1d1d'],
  'chip-blue': ['#bfdbfe', '#2563eb', '#1e3a8a'],
  'chip-green': ['#bbf7d0', '#16a34a', '#14532d'],
  'chip-black': ['#e5e7eb', '#1f2937', '#030712'],
  'chip-purple': ['#ddd6fe', '#7c3aed', '#3b0764'],
  'chip-gold': ['#fef08a', '#ca8a04', '#713f12'],
  'chip-orange': ['#fed7aa', '#ea580c', '#7c2d12'],
  'chip-diamond': ['#cffafe', '#0891b2', '#164e63'],
};
export const paletteOf = (kind) => PALETTE[kind] || PALETTE.brass;

let canvas = null;
let g = null;
let dpr = 1;
let parts = [];
let flyers = [];
let rings = [];
let flashes = [];
let raf = 0;
let last = 0;

const reduced = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const low = () => getSettings().lowFx || reduced();

function ensure() {
  if (canvas || typeof document === 'undefined') return !!canvas;
  canvas = document.createElement('canvas');
  canvas.className = 'mg-fx';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  g = canvas.getContext('2d');
  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
  };
  resize();
  window.addEventListener('resize', resize);
  return true;
}

function start() {
  if (raf) return;
  last = performance.now();
  raf = requestAnimationFrame(tick);
}

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function drawCoin(x, y, r, spin, pal, alpha = 1) {
  // spin: Winkel um die senkrechte Achse → Breite schrumpft, die Kante wird sichtbar
  const w = Math.max(0.12, Math.abs(Math.cos(spin)));
  g.save();
  g.globalAlpha = alpha;
  g.translate(x, y);
  // Kante (Dicke)
  g.fillStyle = pal[2];
  g.beginPath(); g.ellipse(r * 0.12 * Math.sign(Math.sin(spin) || 1), 0, r * w, r, 0, 0, Math.PI * 2); g.fill();
  // Fläche
  const grd = g.createRadialGradient(-r * 0.35 * w, -r * 0.4, r * 0.1, 0, 0, r);
  grd.addColorStop(0, pal[0]); grd.addColorStop(0.5, pal[1]); grd.addColorStop(1, pal[2]);
  g.fillStyle = grd;
  g.beginPath(); g.ellipse(0, 0, r * w, r, 0, 0, Math.PI * 2); g.fill();
  // Glanzlicht
  g.globalAlpha = alpha * 0.55 * w;
  g.fillStyle = '#fff';
  g.beginPath(); g.ellipse(-r * 0.3 * w, -r * 0.35, r * 0.28 * w, r * 0.16, -0.5, 0, Math.PI * 2); g.fill();
  g.restore();
}

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const W = window.innerWidth;
  const H = window.innerHeight;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);

  // Blitze (Goldmünze)
  flashes = flashes.filter(f => (f.t += dt) < f.life);
  for (const f of flashes) {
    const a = (1 - f.t / f.life) * f.power;
    const grd = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
    grd.addColorStop(0, `rgba(255,248,210,${a})`);
    grd.addColorStop(1, 'rgba(255,220,120,0)');
    g.fillStyle = grd;
    g.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
  }

  // Druckwellen
  rings = rings.filter(r => (r.t += dt) < r.life);
  for (const r of rings) {
    const p = r.t / r.life;
    const e = 1 - Math.pow(1 - p, 3);
    g.save();
    g.globalAlpha = (1 - p) * 0.9;
    g.strokeStyle = r.color;
    g.lineWidth = r.width * (1 - p) + 1;
    g.beginPath(); g.ellipse(r.x, r.y, r.r * e, r.r * e * 0.62, 0, 0, Math.PI * 2); g.stroke();
    g.restore();
  }

  // Splitter, Funken, Staub
  parts = parts.filter(p => (p.t += dt) < p.life);
  for (const p of parts) {
    p.vy += p.grav * dt;
    p.vx *= p.drag; p.vy *= p.drag;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.floor != null && p.y > p.floor && p.vy > 0) { p.y = p.floor; p.vy *= -0.38; p.vx *= 0.7; p.vr *= 0.6; }
    p.rot += p.vr * dt;
    const fade = Math.min(1, (p.life - p.t) / (p.life * 0.4));
    if (p.kind === 'spark') {
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = fade;
      g.strokeStyle = p.color;
      g.lineWidth = p.size;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); g.stroke();
      g.restore();
    } else if (p.kind === 'dust') {
      g.save();
      g.globalAlpha = fade * 0.35;
      g.fillStyle = p.color;
      const s = p.size * (1 + p.t * 2.5);
      g.beginPath(); g.ellipse(p.x, p.y, s, s * 0.55, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    } else {
      // Metallsplitter: kleine Scheibe, die sich überschlägt
      g.save();
      g.globalAlpha = fade;
      g.translate(p.x, p.y);
      g.rotate(p.rot * 0.3);
      const sy = Math.max(0.15, Math.abs(Math.cos(p.rot)));
      g.fillStyle = Math.cos(p.rot) > 0 ? p.color : p.dark;
      g.beginPath(); g.ellipse(0, 0, p.size, p.size * sy, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }

  // Münzen, die zum Zähler fliegen
  flyers = flyers.filter(f => {
    f.t += dt;
    if (f.t < f.delay) return true;
    const p = Math.min(1, (f.t - f.delay) / f.dur);
    let tx = f.tx; let ty = f.ty;
    if (f.target && f.target.isConnected) {
      const rr = f.target.getBoundingClientRect();
      tx = rr.left + rr.width / 2; ty = rr.top + rr.height / 2;
    }
    const e = easeInOut(p);
    // Bogen: erst hoch, dann zum Ziel
    const cx = (f.x + tx) / 2 + f.bend;
    const cy = Math.min(f.y, ty) - 90;
    const x = (1 - e) * (1 - e) * f.x + 2 * (1 - e) * e * cx + e * e * tx;
    const y = (1 - e) * (1 - e) * f.y + 2 * (1 - e) * e * cy + e * e * ty;
    const pop = p < 0.15 ? 1 + p / 0.15 * 0.35 : 1.35 - (p - 0.15) / 0.85 * 0.75;
    drawCoin(x, y, f.r * pop, f.spin + p * f.turns, f.pal, p > 0.9 ? (1 - p) * 10 : 1);
    if (!f.lowfx && Math.random() < 0.6) {
      parts.push({ kind: 'spark', x, y, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, grav: 0, drag: 0.9, rot: 0, vr: 0, t: 0, life: 0.25, size: 2, color: f.pal[0] });
    }
    if (p >= 1) { if (f.onArrive) f.onArrive(); return false; }
    return true;
  });

  if (parts.length || flyers.length || rings.length || flashes.length) raf = requestAnimationFrame(tick);
  else { raf = 0; g.clearRect(0, 0, W, H); }
}

export const fx = {
  // Splitter und Funken an einer Bildschirmstelle
  burst(x, y, { kind = 'brass', count = 8, power = 1, sparks = 6, floor = 40 } = {}) {
    if (!ensure() || low()) return;
    const pal = paletteOf(kind);
    if (parts.length > 260) parts.splice(0, parts.length - 200);
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
      const v = (180 + Math.random() * 260) * power;
      parts.push({ kind: 'shard', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, grav: 1400, drag: 0.985, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 30,
        t: 0, life: 0.7 + Math.random() * 0.5, size: 2.5 + Math.random() * 3.5 * power, color: pal[Math.random() < 0.5 ? 0 : 1], dark: pal[2], floor: y + floor + Math.random() * 20 });
    }
    for (let i = 0; i < sparks; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (260 + Math.random() * 380) * power;
      parts.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, grav: 300, drag: 0.9, rot: 0, vr: 0, t: 0, life: 0.3 + Math.random() * 0.25, size: 1.5 + Math.random() * 1.5, color: i % 2 ? '#fff6cc' : pal[0] });
    }
    start();
  },
  // Staubwölkchen, wenn eine Münze landet
  dust(x, y, color = 'rgba(255,240,220,1)') {
    if (!ensure() || low()) return;
    for (let i = 0; i < 4; i++) {
      const dir = i < 2 ? -1 : 1;
      parts.push({ kind: 'dust', x: x + dir * 8, y, vx: dir * (30 + Math.random() * 50), vy: -10 - Math.random() * 15, grav: 0, drag: 0.92, rot: 0, vr: 0, t: 0, life: 0.45, size: 4 + Math.random() * 3, color });
    }
    start();
  },
  ring(x, y, { color = '#ffd34d', r = 120, width = 6, life = 0.55 } = {}) {
    if (!ensure() || low()) return;
    rings.push({ x, y, color, r, width, life, t: 0 });
    start();
  },
  flash(x, y, { r = 220, power = 0.8, life = 0.35 } = {}) {
    if (!ensure() || low()) return;
    flashes.push({ x, y, r, power, life, t: 0 });
    start();
  },
  // Münze fliegt in einem Bogen zum Ziel-Element (z. B. Geldzähler)
  fly(x, y, target, { kind = 'brass', r = 16, delay = 0, onArrive } = {}) {
    if (!ensure() || reduced()) { if (onArrive) onArrive(); return; }
    if (flyers.length > 30) { if (onArrive) onArrive(); return; }
    const rr = target && target.getBoundingClientRect();
    flyers.push({
      x, y, tx: rr ? rr.left + rr.width / 2 : x, ty: rr ? rr.top + rr.height / 2 : y - 300, target,
      r, pal: paletteOf(kind), delay, t: 0, dur: 0.55 + Math.random() * 0.12, spin: Math.random() * 3, turns: 9 + Math.random() * 5,
      bend: (Math.random() - 0.5) * 160, onArrive, lowfx: low(),
    });
    start();
  },
};

// „Schlucken“-Animation am Zähler
export function catchAt(el) {
  if (!el) return;
  el.classList.remove('catch');
  // eslint-disable-next-line no-unused-expressions
  el.offsetWidth; // Animation neu starten
  el.classList.add('catch');
  clearTimeout(el._catchT);
  el._catchT = setTimeout(() => el.classList.remove('catch'), 340);
}
