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
const MB_BASE = [1000, 8000, 60000, 400000, 3000000];
const MB_MULT = { dice:1, mines:3, plinko:8, crash:40, roulette:150, chicken:600, pump:2500 };
export const maxBetCosts = (game) => MB_BASE.map(c => Math.round(c * MB_MULT[game]));

// Win rate upgrade costs per game (5 levels, +4% per level)
export const WINRATE_BONUS_PER_LEVEL = 0.04; // +4% per upgrade
const WR_BASE = [500, 3000, 15000, 80000, 400000];
const WR_MULT = { dice:1, mines:4, plinko:12, crash:60, roulette:250, chicken:1000, pump:4000 };
export const winrateCosts = (game) => WR_BASE.map(c => Math.round(c * WR_MULT[game]));

// Prestige
export const prestigeCost  = (count) => Math.round(50000 * Math.pow(10, count));
export const prestigeMult  = (count) => Math.pow(2, count);
export const PRESTIGE_GAMES_REQ = 3; // need at least 3 games to prestige

// Helper: format large numbers
export const fmt = (n) => {
  if (n >= 1e9)  return (n/1e9).toFixed(n >= 1e10 ? 0 : 1)  + 'B';
  if (n >= 1e6)  return (n/1e6).toFixed(n >= 1e7  ? 0 : 1)  + 'M';
  if (n >= 1000) return (n/1000).toFixed(n >= 1e4  ? 0 : 1)  + 'K';
  return n.toString();
};
