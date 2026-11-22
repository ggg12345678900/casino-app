// ═══════════════════════════════════════════════════════════════════════════
//  Vom Penner zum Casino-Mogul – Spiel-Ökonomie
//  Reine Funktionen ohne React: (state) → Zahlen. Alles Balancing steht hier.
// ═══════════════════════════════════════════════════════════════════════════

export const SAVE_VERSION = 1;

// ─── Orte ──────────────────────────────────────────────────────────────────
// mult: Multiplikator auf den Wert jedes Fundes. games: freigeschaltete Spiele.
export const LOCATIONS = [
  {
    id: 'hinterhof', name: 'Hinterhof-Spielhalle', icon: '🏚️', cost: 0, mult: 1, maxBet: 0, games: [],
    floor: ['#3b2f2a', '#2a211d'], accent: '#a8a29e',
    junk: ['Kronkorken', 'Kaugummi', 'Zigarettenstummel', 'Staub', 'Ein Knopf', 'Rattenkot', 'Kassenbon', 'Eine Socke', 'Glasscherbe'],
    desc: 'Ein dreckiger Hinterhof. Irgendwo zwischen dem Müll liegen verlorene Chips.',
  },
  {
    id: 'kneipe', name: 'Eckkneipe', icon: '🍺', cost: 100, mult: 2, maxBet: 25, games: ['dice'],
    floor: ['#4a2c17', '#2e1a0d'], accent: '#f59e0b',
    junk: ['Bierdeckel', 'Erdnussschale', 'Feuerzeug', 'Klebriger Fleck', 'Dartpfeil', 'Leeres Glas', 'Bierflaschendeckel'],
    desc: 'Klebriger Boden, betrunkene Gäste – hier fällt öfter mal was runter. Würfeln erlaubt!',
  },
  {
    id: 'spielhalle', name: 'Stadt-Spielhalle', icon: '🕹️', cost: 10000, mult: 2.5, maxBet: 1000, games: ['dice', 'mines', 'plinko'],
    floor: ['#2e1065', '#1e0a45'], accent: '#a855f7',
    junk: ['Popcorn', 'Token-Attrappe', 'Kaputter Joystick', 'Gewinnlos (Niete)', 'Strohhalm', 'Kassenzettel'],
    desc: 'Neonlicht und blinkende Automaten. Mines und Plinko warten.',
  },
  {
    id: 'casino', name: 'Stadt-Casino', icon: '🏛️', cost: 2e6, mult: 3, maxBet: 100000, games: ['dice', 'mines', 'plinko', 'crash', 'roulette'],
    floor: ['#7f1d1d', '#4c0d0d'], accent: '#ef4444',
    junk: ['Visitenkarte', 'Manschettenknopf', 'Olive', 'Cocktailschirmchen', 'Verlorener Ohrring', 'Zahnstocher'],
    desc: 'Roter Teppich, Smoking-Pflicht. Die Chips hier sind richtig was wert.',
  },
  {
    id: 'vegas', name: 'Las Vegas', icon: '🌴', cost: 2e9, mult: 4, maxBet: 10000000, games: ['dice', 'mines', 'plinko', 'crash', 'roulette', 'blackjack', 'chicken'],
    floor: ['#78350f', '#451a03'], accent: '#facc15',
    junk: ['Elvis-Perücke', 'Hochzeitsring (Plastik)', 'Show-Ticket', 'Sonnenbrille', 'Federboa', 'Glitzerkonfetti'],
    desc: 'Die Stadt, die niemals schläft. Blackjack und Chicken freigeschaltet.',
  },
  {
    id: 'monaco', name: 'Monaco', icon: '🛥️', cost: 3e12, mult: 5, maxBet: 2e9, games: ['dice', 'mines', 'plinko', 'crash', 'roulette', 'blackjack', 'chicken', 'pump'],
    floor: ['#0c4a6e', '#082f49'], accent: '#38bdf8',
    junk: ['Kaviar-Löffel', 'Yachtschlüssel (Attrappe)', 'Champagnerkorken', 'Rolex-Box (leer)', 'Seidentuch'],
    desc: 'Yachten, Adel und Milliardäre. Wer hier sucht, findet Gold.',
  },
  {
    id: 'mond', name: 'Mond-Casino', icon: '🌙', cost: 3e15, mult: 8, maxBet: 1e12, games: ['dice', 'mines', 'plinko', 'crash', 'roulette', 'blackjack', 'chicken', 'pump'],
    floor: ['#1e293b', '#0f172a'], accent: '#e2e8f0',
    junk: ['Mondstaub', 'Astronautennahrung', 'Kleiner Krater', 'Verlorene Antenne', 'Mondgestein'],
    desc: 'Das exklusivste Casino des Universums. Schwerelos zocken.',
  },
];

// ─── Helfer (suchen automatisch) ───────────────────────────────────────────
export const HELPERS = [
  { id: 'putzkraft', name: 'Putzkraft',    icon: '🧹', baseCost: 5,     speed: 0.5,    loc: 0, desc: 'Fegt den Boden und behält nichts für sich.' },
  { id: 'detektiv',  name: 'Detektiv',     icon: '🕵️', baseCost: 60,    speed: 3,      loc: 0, desc: 'Findet Spuren, wo andere nichts sehen.' },
  { id: 'spuerhund', name: 'Spürhund',     icon: '🐕', baseCost: 700,   speed: 15,     loc: 1, desc: 'Riecht Chips aus zehn Metern.' },
  { id: 'tuersteher',name: 'Türsteher',    icon: '🕴️', baseCost: 9000,  speed: 80,     loc: 2, desc: 'Kassiert verlorene Chips am Eingang ein.' },
  { id: 'croupier',  name: 'Croupier',     icon: '🎩', baseCost: 120000,speed: 400,    loc: 3, desc: 'Lässt beim Abräumen „versehentlich“ was fallen.' },
  { id: 'insider',   name: 'Insider',      icon: '🦹', baseCost: 2e6,   speed: 2500,   loc: 4, desc: 'Kennt jede Ritze im Casino.' },
  { id: 'fee',       name: 'Glücksfee',    icon: '🧚', baseCost: 4e7,   speed: 15000,  loc: 5, desc: 'Zaubert Chips aus dem Nichts.' },
  { id: 'alien',     name: 'Alien-Scout',  icon: '👽', baseCost: 1e9,   speed: 100000, loc: 6, desc: 'Scannt den Boden aus dem Orbit.' },
];
export const HELPER_COST_GROWTH = 1.2;
export const HELPER_SPEED_SCALE = 0.25;
// Bei diesen Stückzahlen verdoppelt sich das Tempo eines Helfers
export const HELPER_MILESTONES = [25, 50, 100, 200, 400];

// ─── Werkzeuge (einmalige Upgrades) ────────────────────────────────────────
// type: chance | value | click | helper | clickPct | all
export const TOOLS = [
  { id: 'brille',     name: 'Brille',              icon: '👓', cost: 0.5,  loc: 0, type: 'chance', x: 1.5, desc: 'Endlich scharf sehen.' },
  { id: 'handschuhe', name: 'Handschuhe',          icon: '🧤', cost: 2,    loc: 0, type: 'value',  x: 2,   desc: 'Du traust dich jetzt auch in die Ecken.' },
  { id: 'lampe',      name: 'Taschenlampe',        icon: '🔦', cost: 8,    loc: 0, type: 'chance', x: 1.5, desc: 'Licht unter den Automaten.' },
  { id: 'schaufel',   name: 'Kehrschaufel',        icon: '🥄', cost: 25,   loc: 0, type: 'click',  x: 2,   desc: 'Jeder Klick durchsucht 2× so viel.' },
  { id: 'magnet',     name: 'Magnet',              icon: '🧲', cost: 150,  loc: 1, type: 'value',  x: 2,   desc: 'Zieht auch die Chips mit Metallkern an.' },
  { id: 'dienstplan', name: 'Dienstplan',          icon: '📋', cost: 600,  loc: 1, type: 'helper', x: 2,   desc: 'Alle Helfer arbeiten doppelt so schnell.' },
  { id: 'detektor',   name: 'Metalldetektor',      icon: '📡', cost: 2500, loc: 1, type: 'chance', x: 2,   desc: 'Piep. Piep. PIEEEP!' },
  { id: 'sauger',     name: 'Industriesauger',     icon: '🌪️', cost: 15000,loc: 2, type: 'click',  x: 3,   desc: 'Jeder Klick saugt 3× so viel Fläche ab.' },
  { id: 'roentgen',   name: 'Röntgenbrille',       icon: '🕶️', cost: 6e4,  loc: 2, type: 'value',  x: 2.5, desc: 'Sieht Chips sogar in Hosentaschen.' },
  { id: 'rede',       name: 'Motivationsrede',     icon: '📢', cost: 2e5,  loc: 2, type: 'helper', x: 2,   desc: '„Wir sind eine Familie!“ – Helfer ×2.' },
  { id: 'drohne',     name: 'Such-Drohne',         icon: '🚁', cost: 1.5e6,loc: 3, type: 'clickPct', x: 0.05, desc: 'Jeder Klick bringt zusätzlich 5% deiner Auto-Suchen pro Sekunde.' },
  { id: 'satellit',   name: 'Satelliten-Scan',     icon: '🛰️', cost: 8e6,  loc: 3, type: 'chance', x: 2,   desc: 'Fundchance ×2 – aus dem All.' },
  { id: 'firmenwagen',name: 'Firmenwagen',         icon: '🚗', cost: 4e7,  loc: 3, type: 'helper', x: 2,   desc: 'Helfer kommen schneller zur Arbeit. ×2' },
  { id: 'ki',         name: 'KI-Analyse',          icon: '🧠', cost: 1e10, loc: 4, type: 'value',  x: 3,   desc: 'Berechnet, wo die wertvollsten Chips fallen.' },
  { id: 'greifer',    name: 'Präzisionsgreifer',   icon: '🦾', cost: 6e10, loc: 4, type: 'click',  x: 10,  desc: 'Jeder Klick ×10.' },
  { id: 'kredit',     name: 'Bankkredit',          icon: '🏦', cost: 3e11, loc: 4, type: 'helper', x: 2,   desc: 'Mehr Budget, mehr Leute. Helfer ×2.' },
  { id: 'kugel',      name: 'Kristallkugel',       icon: '🔮', cost: 3e13, loc: 5, type: 'value',  x: 4,   desc: 'Du weißt, wo der nächste Chip fällt.' },
  { id: 'zeit',       name: 'Zeitmaschine',        icon: '⏳', cost: 3e14, loc: 5, type: 'helper', x: 3,   desc: 'Helfer arbeiten in mehreren Zeitlinien. ×3' },
  { id: 'meteor',     name: 'Meteoriten-Detektor', icon: '☄️', cost: 1e17, loc: 6, type: 'value',  x: 5,   desc: 'Findet Chips aus Sternenstaub.' },
  { id: 'krone',      name: 'Mogul-Krone',         icon: '👑', cost: 1e18, loc: 6, type: 'all',    x: 10,  desc: 'Du bist der Casino-Mogul. Alles ×10.' },
];

// ─── Glücksbringer (seltene Funde, nur beim eigenen Suchen) ───────────────
// odds: 1 zu X pro Suche. bonus pro Exemplar. max: maximale Anzahl.
export const CHARMS = [
  { id: 'cent',      name: 'Glückscent',        icon: '🪙', odds: 300,    max: 10, type: 'value',  bonus: 0.05, desc: '+5% Fundwert' },
  { id: 'klee',      name: 'Vierblättriges Kleeblatt', icon: '🍀', odds: 1000,   max: 10, type: 'chance', bonus: 0.05, desc: '+5% Fundchance' },
  { id: 'kaefer',    name: 'Marienkäfer',       icon: '🐞', odds: 2500,   max: 10, type: 'helper', bonus: 0.10, desc: '+10% Helfer-Tempo' },
  { id: 'wuerfel',   name: 'Goldener Würfel',   icon: '🎲', odds: 5000,   max: 5,  type: 'gamble', bonus: 0.01, desc: '+1% Gewinnbonus beim Zocken' },
  { id: 'hufeisen',  name: 'Hufeisen',          icon: '🧿', odds: 10000,  max: 10, type: 'all',    bonus: 0.10, desc: '+10% auf alles' },
  { id: 'regenbogen',name: 'Regenbogen-Chip',   icon: '🌈', odds: 25000,  max: 5,  type: 'value',  bonus: 0.25, desc: '+25% Fundwert' },
  { id: 'nadel',     name: 'Diamant-Nadel',     icon: '💎', odds: 100000, max: 5,  type: 'allx',   bonus: 2,    desc: '×2 auf alles (die Nadel im Heuhaufen!)' },
];

// ─── Skills (leveln durch Benutzen) ────────────────────────────────────────
export const SKILLS = {
  suchen:     { name: 'Suchen',     icon: '🔍', base: 20, growth: 1.2, desc: (l) => `Fundchance +${l * 3}% · Fundwert ×${Math.pow(1.05, l).toFixed(2)}` },
  management: { name: 'Management', icon: '📊', base: 3,  growth: 1.2,  desc: (l) => `Helfer-Tempo +${l * 5}%` },
  zocken:     { name: 'Zocken',     icon: '🎲', base: 10, growth: 1.15, desc: (l) => `Gewinnbonus +${(Math.min(0.10, l * 0.004) * 100).toFixed(1)}%` },
};
export const xpForLevel = (skill, level) => Math.floor(SKILLS[skill].base * Math.pow(SKILLS[skill].growth, level));

// ─── Grundwerte ────────────────────────────────────────────────────────────
export const BASE_CHANCE = 0.05;   // 1 von 20 Suchen findet etwas
export const BASE_VALUE = 0.10;    // 10 Cent
export const GOLD_CHIP_CHANCE = 0.02; // 2% der eigenen Funde sind Goldchips
export const GOLD_CHIP_MULT = 25;
export const OFFLINE_CAP_SEC = 8 * 3600;

// ─── Zustand ───────────────────────────────────────────────────────────────
export const newGame = () => ({
  v: SAVE_VERSION,
  money: 0,
  location: 0,
  helpers: {},
  tools: [],
  charms: {},
  skills: { suchen: { level: 0, xp: 0 }, management: { level: 0, xp: 0 }, zocken: { level: 0, xp: 0 } },
  stats: {
    totalEarned: 0, clicks: 0, searches: 0, finds: 0, goldChips: 0,
    bets: 0, betWins: 0, gambleProfit: 0, biggestWin: 0, playTime: 0, startedAt: Date.now(),
  },
  savedAt: Date.now(),
});

// Fehlende Felder aus älteren Spielständen auffüllen
export const migrate = (s) => {
  const base = newGame();
  if (!s || typeof s !== 'object') return base;
  return {
    ...base, ...s,
    skills: { ...base.skills, ...(s.skills || {}) },
    stats: { ...base.stats, ...(s.stats || {}) },
    helpers: s.helpers || {}, tools: s.tools || [], charms: s.charms || {},
  };
};

// ─── Abgeleitete Werte ─────────────────────────────────────────────────────
const toolMult = (s, type) => TOOLS.reduce((m, t) => (t.type === type && s.tools.includes(t.id) ? m * t.x : m), 1);
const charmSum = (s, type) => CHARMS.reduce((m, c) => (c.type === type ? m + (s.charms[c.id] || 0) * c.bonus : m), 0);

export const helperCost = (h, owned) => h.baseCost * Math.pow(HELPER_COST_GROWTH, owned);
// Kosten für n Stück auf einmal (geometrische Reihe)
export const helperCostN = (h, owned, n) =>
  h.baseCost * Math.pow(HELPER_COST_GROWTH, owned) * (Math.pow(HELPER_COST_GROWTH, n) - 1) / (HELPER_COST_GROWTH - 1);
export const maxAffordable = (h, owned, money) => {
  const c0 = helperCost(h, owned);
  if (money < c0) return 0;
  return Math.floor(Math.log(1 + (money * (HELPER_COST_GROWTH - 1)) / c0) / Math.log(HELPER_COST_GROWTH));
};
export const milestoneCount = (owned) => HELPER_MILESTONES.filter(m => owned >= m).length;
export const nextMilestone = (owned) => HELPER_MILESTONES.find(m => owned < m) || null;

export const derive = (s) => {
  const sk = s.skills;
  const allMult = toolMult(s, 'all') * (1 + charmSum(s, 'all')) * Math.pow(2, s.charms.nadel || 0);

  let chance = BASE_CHANCE * toolMult(s, 'chance') * (1 + sk.suchen.level * 0.03) * (1 + charmSum(s, 'chance'));
  let overflow = 1;
  if (chance > 1) { overflow = chance; chance = 1; } // Überschuss wird zu Fundwert

  const value = BASE_VALUE * toolMult(s, 'value') * Math.pow(1.05, sk.suchen.level)
    * LOCATIONS[s.location].mult * (1 + charmSum(s, 'value')) * overflow * allMult;

  const helperMult = toolMult(s, 'helper') * (1 + sk.management.level * 0.05) * (1 + charmSum(s, 'helper'));
  const helperRates = {};
  let autoSearches = 0;
  HELPERS.forEach(h => {
    const n = s.helpers[h.id] || 0;
    const r = n * h.speed * HELPER_SPEED_SCALE * Math.pow(2, milestoneCount(n)) * helperMult;
    helperRates[h.id] = r;
    autoSearches += r;
  });

  const clickSearches = toolMult(s, 'click');
  const clickPct = TOOLS.reduce((m, t) => (t.type === 'clickPct' && s.tools.includes(t.id) ? m + t.x : m), 0);
  const winBonus = Math.min(0.15, Math.min(0.10, sk.zocken.level * 0.004) + charmSum(s, 'gamble'));
  const loc = LOCATIONS[s.location];

  return {
    chance, value, autoSearches, helperRates, helperMult,
    incomePerSec: autoSearches * chance * value,
    clickSearches, clickPct,
    clickEV: (clickSearches + clickPct * autoSearches) * chance * value,
    winBonus, maxBet: loc.maxBet, games: loc.games,
  };
};

// ─── Aktionen (geben neuen Zustand zurück) ────────────────────────────────
const addXp = (skills, key, amount) => {
  let { level, xp } = skills[key];
  xp += amount;
  let ups = 0;
  while (xp >= xpForLevel(key, level)) { xp -= xpForLevel(key, level); level++; ups++; if (ups > 500) break; }
  return { skills: { ...skills, [key]: { level, xp } }, ups };
};

const earn = (s, amount) => ({ ...s, money: s.money + amount, stats: { ...s.stats, totalEarned: s.stats.totalEarned + amount } });

// Zeit vergeht: Helfer verdienen
export const tick = (s, dtSec) => {
  const d = derive(s);
  const next = earn(s, d.incomePerSec * dtSec);
  next.stats = { ...next.stats, playTime: next.stats.playTime + dtSec };
  return next;
};

// Ein Klick aufs Suchfeld. rng ist für Tests austauschbar.
export const search = (s, rng = Math.random) => {
  const d = derive(s);
  const n = d.clickSearches;
  let found = 0; let gold = 0; let money = 0;
  for (let i = 0; i < n; i++) {
    if (rng() < d.chance) {
      found++;
      if (rng() < GOLD_CHIP_CHANCE) { gold++; money += d.value * GOLD_CHIP_MULT; } else money += d.value;
    }
  }
  const bonus = d.clickPct * d.autoSearches * d.chance * d.value; // Drohne: Erwartungswert
  money += bonus;

  // Glücksbringer: pro Klick höchstens einer, seltenster zuerst geprüft
  let charm = null;
  const charms = { ...s.charms };
  for (const c of [...CHARMS].reverse()) {
    if ((charms[c.id] || 0) >= c.max) continue;
    const p = 1 / c.odds;
    if (rng() < p) { charms[c.id] = (charms[c.id] || 0) + 1; charm = c; break; }
  }

  const { skills, ups } = addXp(s.skills, 'suchen', 1);
  let next = earn({ ...s, skills, charms }, money);
  next.stats = {
    ...next.stats, clicks: s.stats.clicks + 1, searches: s.stats.searches + n,
    finds: s.stats.finds + found, goldChips: s.stats.goldChips + gold,
  };
  const junkList = LOCATIONS[s.location].junk;
  return {
    state: next,
    result: { money, found, gold, charm, levelUp: ups > 0 ? skills.suchen.level : null, junk: found === 0 && bonus === 0 ? junkList[Math.floor(rng() * junkList.length)] : null },
  };
};

export const buyHelper = (s, id, count = 1) => {
  const h = HELPERS.find(x => x.id === id);
  if (!h || h.loc > s.location || count < 1) return null;
  const owned = s.helpers[id] || 0;
  const cost = helperCostN(h, owned, count);
  if (s.money < cost) return null;
  const { skills } = addXp(s.skills, 'management', count);
  return { ...s, money: s.money - cost, helpers: { ...s.helpers, [id]: owned + count }, skills };
};

export const buyTool = (s, id) => {
  const t = TOOLS.find(x => x.id === id);
  if (!t || t.loc > s.location || s.tools.includes(id) || s.money < t.cost) return null;
  const { skills } = addXp(s.skills, 'management', 5);
  return { ...s, money: s.money - t.cost, tools: [...s.tools, id], skills };
};

export const moveLocation = (s) => {
  const next = LOCATIONS[s.location + 1];
  if (!next || s.money < next.cost) return null;
  const { skills } = addXp(s.skills, 'management', 25);
  return { ...s, money: s.money - next.cost, location: s.location + 1, skills };
};

// Ergebnis einer Casino-Runde: XP + Statistik (Geld bewegen die Spiele selbst)
export const recordBet = (s, didWin, amount) => {
  const { skills } = addXp(s.skills, 'zocken', 1);
  const st = s.stats;
  return {
    ...s, skills,
    stats: {
      ...st, bets: st.bets + 1, betWins: st.betWins + (didWin ? 1 : 0),
      gambleProfit: st.gambleProfit + (didWin ? amount : -amount),
      biggestWin: didWin && amount > st.biggestWin ? amount : st.biggestWin,
    },
  };
};

// Offline-Einnahmen seit dem letzten Speichern
export const offlineProgress = (s, now = Date.now()) => {
  const sec = Math.min(Math.max(0, (now - (s.savedAt || now)) / 1000), OFFLINE_CAP_SEC);
  const earned = derive(s).incomePerSec * sec;
  return { seconds: sec, earned, state: earn(s, earned) };
};

// ─── Zahlenformat ──────────────────────────────────────────────────────────
const SUFFIX = ['', 'K', 'Mio', 'Mrd', 'Bio', 'Brd', 'Trio', 'Trd', 'Qua'];
export const fmt = (n, dec = 2) => {
  if (!isFinite(n)) return '∞';
  if (Math.abs(n) < 1000) return n.toFixed(Math.abs(n) < 100 ? dec : Math.min(dec, 1)).replace('.', ',');
  const i = Math.min(SUFFIX.length - 1, Math.floor(Math.log10(Math.abs(n)) / 3));
  const v = n / Math.pow(1000, i);
  return v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0).replace('.', ',') + ' ' + SUFFIX[i];
};
export const fmtMoney = (n) => fmt(n) + ' €';
export const fmtTime = (sec) => {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = sec % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
};
