// Ein Spielautomat pro Ort. Gleiche Mathematik für alle (≈97,5 % Ausschüttung),
// nur Symbole, Farben und Namen ändern sich. syms[0] = häufigstes, syms[5] = Jackpot-Symbol.
export const SLOT_THEMES = {
  hinterhof: {
    name: 'Kronkorken-Kiste', icon: '🥫', syms: ['🧦', '🍌', '🥫', '🐀', '💰', '👑'], scatter: '🎁',
    c1: '#6b4f3a', c2: '#2a1d14', neon: '#ffb347', glass: '#f4e7d3',
  },
  kneipe: {
    name: 'Bier-Bonanza', icon: '🍺', syms: ['🥨', '🍺', '🎯', '🍻', '🍀', '7️⃣'], scatter: '🎳',
    c1: '#8a4b12', c2: '#3a1c05', neon: '#ffcf3d', glass: '#fff3d6',
  },
  spielhalle: {
    name: 'Neon Arcade', icon: '👾', syms: ['🍒', '👾', '🕹️', '⭐', '💎', '7️⃣'], scatter: '🎟️',
    c1: '#5b21b6', c2: '#1e0a45', neon: '#22d3ee', glass: '#ecfeff',
  },
  casino: {
    name: 'Royal Fruits', icon: '🍒', syms: ['🍒', '🍋', '🔔', '🍉', '💎', '7️⃣'], scatter: '⭐',
    c1: '#9f1239', c2: '#3b0716', neon: '#ff3ea5', glass: '#fff1f5',
  },
  vegas: {
    name: 'Viva Vegas', icon: '🌴', syms: ['🎲', '🃏', '🕶️', '💃', '💎', '🎰'], scatter: '🌴',
    c1: '#c2410c', c2: '#431407', neon: '#facc15', glass: '#fffbeb',
  },
  monaco: {
    name: 'Riviera Gold', icon: '🛥️', syms: ['🍾', '🦞', '⌚', '🛥️', '💎', '👑'], scatter: '⚓',
    c1: '#0e7490', c2: '#082f49', neon: '#7dd3fc', glass: '#f0f9ff',
  },
  mond: {
    name: 'Lunar Jackpot', icon: '🌕', syms: ['🪐', '🛸', '🚀', '👽', '💫', '🌕'], scatter: '☄️',
    c1: '#334155', c2: '#020617', neon: '#c4b5fd', glass: '#f5f3ff',
  },
};

// Gewichte (Häufigkeit) pro Walzenposition und Auszahlung bei 3 Gleichen auf der Linie
export const SLOT_WEIGHTS = [7, 6, 5, 4, 2, 1];
export const SLOT_PAYS = [5, 8, 12, 25, 60, 250];
export const SCATTER_WEIGHT = 1.5;
export const PAIR_LOW = 2;        // 2× das häufigste Symbol
export const PAIR_OTHER = 0.5;    // sonst 2 Gleiche: halber Einsatz zurück
export const FREE_SPINS = 8;      // 3+ Scatter irgendwo im Fenster
export const FREE_SPIN_MULT = 2;  // Gewinne in Freispielen ×2
