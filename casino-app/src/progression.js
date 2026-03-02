// ─── Shared Progression Constants ────────────────────────────────────────────
// Used by frontend (Lobby, UpgradePanel, games) and mirrored in server

export const GAME_ORDER = ['dice','mines','plinko','crash','roulette','chicken','pump'];

export const GAMES_META = {
  dice:     { cost: 0,           prestigeReq: 0, icon: '🎲', name: 'Dice',     color: '#3b82f6' },
  mines:    { cost: 1000,        prestigeReq: 0, icon: '💣', name: 'Mines',    color: '#ef4444' },
  plinko:   { cost: 10000,       prestigeReq: 0, icon: '🎯', name: 'Plinko',   color: '#8b5cf6' },
  crash:    { cost: 100000,      prestigeReq: 1, icon: '🚀', name: 'Crash',    color: '#f97316' },
  roulette: { cost: 1000000,     prestigeReq: 1, icon: '🎡', name: 'Roulette', color: '#ec4899' },
  chicken:  { cost: 10000000,    prestigeReq: 2, icon: '🐔', name: 'Chicken',  color: '#4ade80' },
  pump:     { cost: 100000000,   prestigeReq: 2, icon: '🎈', name: 'Pump',     color: '#06b6d4' },
};

// Max bet levels: index = level (0=default, 5=max)
export const MAX_BET_VALUES = [50, 200, 1000, 5000, 25000, 100000];

// Max bet upgrade costs per game (cost to go from level N to N+1, 5 upgrades)
const MB_BASE = [200, 1000, 5000, 25000, 150000];
const MB_MULT = { dice:1, mines:2, plinko:5, crash:15, roulette:50, chicken:150, pump:500 };
export const maxBetCosts = (game) => MB_BASE.map(c => Math.round(c * MB_MULT[game]));

// Win rate upgrade costs per game (5 levels, +4% per level)
export const WINRATE_BONUS_PER_LEVEL = 0.04; // +4% per upgrade
const WR_BASE = [100, 500, 2500, 12000, 60000];
const WR_MULT = { dice:1, mines:2, plinko:5, crash:15, roulette:50, chicken:150, pump:500 };
export const winrateCosts = (game) => WR_BASE.map(c => Math.round(c * WR_MULT[game]));

// Prestige
export const prestigeCost  = (count) => Math.round(50000 * Math.pow(10, count));
export const prestigeMult  = (count) => Math.pow(2, count);
export const PRESTIGE_GAMES_REQ = 3; // need at least 3 games to prestige

// ─── Globale Upgrades ─────────────────────────────────────────────────────────
export const GLOBAL_UPGRADES = [
  {
    id: 'global_mult',
    icon: '💎',
    name: 'Globaler Bonus',
    desc: '+3% Gewinn auf alle Spiele',
    color: '#a78bfa',
    maxLevel: 5,
    costs: [5000, 25000, 150000, 1000000, 8000000],
    getValue: (lvl) => (1 + lvl * 0.03).toFixed(2) + 'x',
  },
  {
    id: 'start_balance',
    icon: '🏦',
    name: 'Start-Balance',
    desc: 'Mehr Startgeld nach Prestige',
    color: '#34d399',
    maxLevel: 5,
    costs: [2000, 15000, 100000, 750000, 5000000],
    getValue: (lvl) => [1000, 2000, 5000, 10000, 25000, 50000][lvl] + '€',
  },
  {
    id: 'auto_speed',
    icon: '⚡',
    name: 'Auto-Speed',
    desc: 'Schnellere Auto-Runden',
    color: '#fbbf24',
    maxLevel: 5,
    costs: [3000, 20000, 120000, 800000, 6000000],
    getValue: (lvl) => [700, 600, 500, 400, 300, 200][lvl] + 'ms',
  },
  {
    id: 'daily_bonus',
    icon: '🎁',
    name: 'Daily Reward',
    desc: 'Höheres tägliches Guthaben',
    color: '#f97316',
    maxLevel: 5,
    costs: [1000, 8000, 60000, 500000, 4000000],
    getValue: (lvl) => [100, 200, 500, 1000, 2500, 5000][lvl] + '€',
  },
];

export const GLOBAL_START_BALANCE = [1000, 2000, 5000, 10000, 25000, 50000];
export const GLOBAL_AUTO_SPEED    = [700, 600, 500, 400, 300, 200]; // ms
export const GLOBAL_DAILY_BONUS   = [100, 200, 500, 1000, 2500, 5000];

// Helper: format large numbers
export const fmt = (n) => {
  if (n >= 1e9)  return (n/1e9).toFixed(n >= 1e10 ? 0 : 1)  + 'B';
  if (n >= 1e6)  return (n/1e6).toFixed(n >= 1e7  ? 0 : 1)  + 'M';
  if (n >= 1000) return (n/1000).toFixed(n >= 1e4  ? 0 : 1)  + 'K';
  return n.toString();
};
