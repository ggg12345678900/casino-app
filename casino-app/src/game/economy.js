// ═══════════════════════════════════════════════════════════════════════════
//  Vom Penner zum Casino-Mogul – Spiel-Ökonomie
//  Reine Funktionen ohne React: (state) → Zahlen. Alles Balancing steht hier.
// ═══════════════════════════════════════════════════════════════════════════

export const SAVE_VERSION = 2; // erhöhen = alle Spielstände starten neu

// ─── Münzen & Chips ─────────────────────────────────────────────────────────
// kind bestimmt das Aussehen auf dem Boden
export const COINS = [
  { id: 'c1',   v: 0.01,  label: '1',    unit: 'ct', kind: 'copper',  size: 36 },
  { id: 'c2',   v: 0.02,  label: '2',    unit: 'ct', kind: 'copper',  size: 41 },
  { id: 'c5',   v: 0.05,  label: '5',    unit: 'ct', kind: 'copper',  size: 46 },
  { id: 'c10',  v: 0.10,  label: '10',   unit: 'ct', kind: 'brass',   size: 43 },
  { id: 'c20',  v: 0.20,  label: '20',   unit: 'ct', kind: 'brass',   size: 48 },
  { id: 'c50',  v: 0.50,  label: '50',   unit: 'ct', kind: 'brass',   size: 53 },
  { id: 'e1',   v: 1,     label: '1',    unit: '€',  kind: 'bimetal', size: 50 },
  { id: 'e2',   v: 2,     label: '2',    unit: '€',  kind: 'bimetal2',size: 55 },
  { id: 'k5',   v: 5,     label: '5',    unit: '€',  kind: 'chip-red',    size: 55 },
  { id: 'k10',  v: 10,    label: '10',   unit: '€',  kind: 'chip-blue',   size: 55 },
  { id: 'k25',  v: 25,    label: '25',   unit: '€',  kind: 'chip-green',  size: 58 },
  { id: 'k100', v: 100,   label: '100',  unit: '€',  kind: 'chip-black',  size: 58 },
  { id: 'k500', v: 500,   label: '500',  unit: '€',  kind: 'chip-purple', size: 60 },
  { id: 'k1k',  v: 1000,  label: '1K',   unit: '€',  kind: 'chip-gold',   size: 60 },
  { id: 'k5k',  v: 5000,  label: '5K',   unit: '€',  kind: 'chip-orange', size: 62 },
  { id: 'k25k', v: 25000, label: '25K',  unit: '€',  kind: 'chip-diamond',size: 65 },
];
// Häufigkeit der vier Münzsorten eines Ortes (von klein nach groß)
export const COIN_WEIGHTS = [50, 30, 15, 5];

// ─── Orte ──────────────────────────────────────────────────────────────────
// coins: welche vier Münzsorten hier herumliegen. games: freigeschaltete Spiele.
export const LOCATIONS = [
  {
    id: 'hinterhof', name: 'Hinterhof-Spielhalle', icon: '🏚️', cost: 0, coins: ['c1', 'c2', 'c5', 'c10'], maxBet: 0, games: [],
    junk: ['Kronkorken', 'Kaugummi', 'Zigarettenstummel', 'Staub', 'Ein Knopf', 'Rattenkot', 'Kassenbon', 'Eine Socke', 'Glasscherbe'],
    desc: 'Ein dreckiger Hinterhof. Zwischen dem Müll liegt hier und da ein Cent.',
  },
  {
    id: 'kneipe', name: 'Eckkneipe', icon: '🍺', cost: 25, coins: ['c5', 'c10', 'c20', 'c50'], maxBet: 5, games: ['slots', 'dice'],
    junk: ['Bierdeckel', 'Erdnussschale', 'Feuerzeug', 'Klebriger Fleck', 'Dartpfeil', 'Leeres Glas', 'Bierflaschendeckel'],
    desc: 'Klebriger Boden, betrunkene Gäste – hier fällt öfter mal Kleingeld runter. Würfeln erlaubt!',
  },
  {
    id: 'spielhalle', name: 'Stadt-Spielhalle', icon: '🕹️', cost: 10000, coins: ['c20', 'c50', 'e1', 'e2'], maxBet: 1000, games: ['slots', 'dice', 'mines', 'plinko'],
    junk: ['Popcorn', 'Token-Attrappe', 'Kaputter Joystick', 'Gewinnlos (Niete)', 'Strohhalm', 'Kassenzettel'],
    desc: 'Neonlicht und blinkende Automaten. Hier rollen Euro-Münzen. Mines und Plinko warten.',
  },
  {
    id: 'casino', name: 'Stadt-Casino', icon: '🏛️', cost: 8e6, coins: ['e1', 'e2', 'k5', 'k10'], maxBet: 4e5, games: ['slots', 'dice', 'mines', 'plinko', 'crash', 'roulette'],
    junk: ['Visitenkarte', 'Manschettenknopf', 'Olive', 'Cocktailschirmchen', 'Verlorener Ohrring', 'Zahnstocher'],
    desc: 'Roter Teppich, Smoking-Pflicht. Die ersten echten Casino-Chips liegen herum.',
  },
  {
    id: 'vegas', name: 'Las Vegas', icon: '🌴', cost: 4.8e9, coins: ['k5', 'k10', 'k25', 'k100'], maxBet: 6e7, games: ['slots', 'dice', 'mines', 'plinko', 'crash', 'roulette', 'blackjack', 'chicken'],
    junk: ['Elvis-Perücke', 'Hochzeitsring (Plastik)', 'Show-Ticket', 'Sonnenbrille', 'Federboa', 'Glitzerkonfetti'],
    desc: 'Die Stadt, die niemals schläft. Chips bis 100 €. Blackjack und Chicken freigeschaltet.',
  },
  {
    id: 'monaco', name: 'Monaco', icon: '🛥️', cost: 3e12, coins: ['k25', 'k100', 'k500', 'k1k'], maxBet: 7.5e9, games: ['slots', 'dice', 'mines', 'plinko', 'crash', 'roulette', 'blackjack', 'chicken', 'pump'],
    junk: ['Kaviar-Löffel', 'Yachtschlüssel (Attrappe)', 'Champagnerkorken', 'Rolex-Box (leer)', 'Seidentuch'],
    desc: 'Yachten, Adel und Milliardäre. Hier liegen 1000-€-Chips unterm Tisch.',
  },
  {
    id: 'mond', name: 'Mond-Casino', icon: '🌙', cost: 4e15, coins: ['k500', 'k1k', 'k5k', 'k25k'], maxBet: 2.66e12, games: ['slots', 'dice', 'mines', 'plinko', 'crash', 'roulette', 'blackjack', 'chicken', 'pump'],
    junk: ['Mondstaub', 'Astronautennahrung', 'Kleiner Krater', 'Verlorene Antenne', 'Mondgestein'],
    desc: 'Das exklusivste Casino des Universums. Schwerelose 25.000-€-Chips.',
  },
];
export const coinById = (id) => COINS.find(c => c.id === id);
// Durchschnittswert einer Münze an einem Ort
export const avgCoin = (locIdx) => {
  const ids = LOCATIONS[locIdx].coins;
  const tot = COIN_WEIGHTS.reduce((a, b) => a + b, 0);
  return ids.reduce((sum, id, i) => sum + coinById(id).v * COIN_WEIGHTS[i], 0) / tot;
};

// ─── Helfer (sammeln automatisch Münzen) ───────────────────────────────────
// speed: Münzen pro Sekunde je Stück. Jeder Helfer sammelt die Münzsorten seines Heimatorts (loc).
export const HELPERS = [
  { id: 'putzkraft', name: 'Putzkraft',    icon: '🧹', baseCost: 0.5,  speed: 0.1,  loc: 0, desc: 'Fegt den Boden und behält nichts für sich.' },
  { id: 'detektiv',  name: 'Detektiv',     icon: '🕵️', baseCost: 6,    speed: 0.6,  loc: 0, desc: 'Findet Spuren, wo andere nichts sehen.' },
  { id: 'spuerhund', name: 'Spürhund',     icon: '🐕', baseCost: 120,  speed: 3,    loc: 1, desc: 'Riecht Kleingeld aus zehn Metern.' },
  { id: 'tuersteher',name: 'Türsteher',    icon: '🕴️', baseCost: 32000, speed: 15,   loc: 2, desc: 'Kassiert verlorene Münzen am Eingang ein.' },
  { id: 'croupier',  name: 'Croupier',     icon: '🎩', baseCost: 3.2e7,  speed: 70,   loc: 3, desc: 'Lässt beim Abräumen „versehentlich“ Chips fallen.' },
  { id: 'insider',   name: 'Insider',      icon: '🦹', baseCost: 1.92e10,  speed: 350,  loc: 4, desc: 'Kennt jede Ritze im Casino.' },
  { id: 'fee',       name: 'Glücksfee',    icon: '🧚', baseCost: 1.2e13, speed: 1800, loc: 5, desc: 'Zaubert Chips aus dem Nichts.' },
  { id: 'alien',     name: 'Alien-Scout',  icon: '👽', baseCost: 2e16, speed: 9000, loc: 6, desc: 'Scannt den Boden aus dem Orbit.' },
];
export const HELPER_COST_GROWTH = 1.2;
// Bei diesen Stückzahlen verdoppelt sich das Tempo eines Helfers
export const HELPER_MILESTONES = [25, 50, 100, 200, 400];

// ─── Werkzeuge (einmalige Upgrades) ────────────────────────────────────────
// type: spawn (mehr Münzen) | value (Münzwert) | pick (Wert beim Aufheben)
//       | helper | pickPct (Aufheben bringt % des Helfer-Einkommens) | all
export const TOOLS = [
  { id: 'brille',     name: 'Brille',              icon: '👓', cost: 0.1, loc: 0, type: 'spawn',  x: 1.3, desc: 'Endlich scharf sehen – du entdeckst mehr Münzen.' },
  { id: 'handschuhe', name: 'Handschuhe',          icon: '🧤', cost: 0.4, loc: 0, type: 'value',  x: 2,   desc: 'Du traust dich jetzt auch in die Ecken.' },
  { id: 'lampe',      name: 'Taschenlampe',        icon: '🔦', cost: 1.5, loc: 0, type: 'spawn',  x: 1.3, desc: 'Licht unter den Automaten.' },
  { id: 'schaufel',   name: 'Kehrschaufel',        icon: '🥄', cost: 6,    loc: 0, type: 'pick',   x: 2,   desc: 'Du schaufelst mehrere Münzen auf einmal auf.' },
  { id: 'magnet',     name: 'Magnet',              icon: '🧲', cost: 40,   loc: 1, type: 'value',  x: 2,   desc: 'Zieht die Münzen aus jeder Ritze.' },
  { id: 'dienstplan', name: 'Dienstplan',          icon: '📋', cost: 150,  loc: 1, type: 'helper', x: 2,   desc: 'Alle Helfer arbeiten doppelt so schnell.' },
  { id: 'detektor',   name: 'Metalldetektor',      icon: '📡', cost: 600,  loc: 1, type: 'spawn',  x: 1.5, desc: 'Piep. Piep. PIEEEP!' },
  { id: 'sauger',     name: 'Industriesauger',     icon: '🌪️', cost: 32000, loc: 2, type: 'pick',   x: 3,   desc: 'Jeder Klick saugt 3× so viel auf.' },
  { id: 'roentgen',   name: 'Röntgenbrille',       icon: '🕶️', cost: 1.2e5,  loc: 2, type: 'value',  x: 2.5, desc: 'Sieht Münzen sogar in Hosentaschen.' },
  { id: 'rede',       name: 'Motivationsrede',     icon: '📢', cost: 4e5,  loc: 2, type: 'helper', x: 2,   desc: '„Wir sind eine Familie!“ – Helfer ×2.' },
  { id: 'drohne',     name: 'Such-Drohne',         icon: '🚁', cost: 3.2e7,  loc: 3, type: 'pickPct', x: 0.5, desc: 'Jede aufgehobene Münze bringt zusätzlich 0,5 Sekunden Helfer-Einkommen.' },
  { id: 'satellit',   name: 'Satelliten-Scan',     icon: '🛰️', cost: 1.6e8,  loc: 3, type: 'spawn',  x: 1.5, desc: 'Mehr Münzen – aus dem All entdeckt.' },
  { id: 'firmenwagen',name: 'Firmenwagen',         icon: '🚗', cost: 8e8,  loc: 3, type: 'helper', x: 2,   desc: 'Helfer kommen schneller zur Arbeit. ×2' },
  { id: 'ki',         name: 'KI-Analyse',          icon: '🧠', cost: 2.4e10,  loc: 4, type: 'value',  x: 3,   desc: 'Berechnet, wo die wertvollsten Chips fallen.' },
  { id: 'greifer',    name: 'Präzisionsgreifer',   icon: '🦾', cost: 1.44e11,  loc: 4, type: 'pick',   x: 10,  desc: 'Jeder Klick ×10.' },
  { id: 'kredit',     name: 'Bankkredit',          icon: '🏦', cost: 7.2e11, loc: 4, type: 'helper', x: 2,   desc: 'Mehr Budget, mehr Leute. Helfer ×2.' },
  { id: 'kugel',      name: 'Kristallkugel',       icon: '🔮', cost: 3e13, loc: 5, type: 'value',  x: 4,   desc: 'Du weißt, wo der nächste Chip fällt.' },
  { id: 'zeit',       name: 'Zeitmaschine',        icon: '⏳', cost: 3e14, loc: 5, type: 'helper', x: 3,   desc: 'Helfer arbeiten in mehreren Zeitlinien. ×3' },
  { id: 'meteor',     name: 'Meteoriten-Detektor', icon: '☄️', cost: 6.68e16, loc: 6, type: 'value',  x: 5,   desc: 'Findet Chips aus Sternenstaub.' },
  { id: 'krone',      name: 'Mogul-Krone',         icon: '👑', cost: 6.68e17, loc: 6, type: 'all',    x: 10,  desc: 'Du bist der Casino-Mogul. Alles ×10.' },
];

// ─── Glücksbringer (tauchen selten als Objekt auf dem Boden auf) ──────────
// odds: 1 zu X pro erscheinender Münze. bonus pro Exemplar. max: maximale Anzahl.
export const CHARMS = [
  { id: 'cent',      name: 'Glückscent',        icon: '🪙', odds: 300,    max: 10, type: 'value',  bonus: 0.05, desc: '+5% Münzwert' },
  { id: 'klee',      name: 'Vierblättriges Kleeblatt', icon: '🍀', odds: 1000,   max: 10, type: 'spawn', bonus: 0.05, desc: '+5% mehr Münzen' },
  { id: 'kaefer',    name: 'Marienkäfer',       icon: '🐞', odds: 2500,   max: 10, type: 'helper', bonus: 0.10, desc: '+10% Helfer-Tempo' },
  { id: 'wuerfel',   name: 'Goldener Würfel',   icon: '🎲', odds: 5000,   max: 5,  type: 'gamble', bonus: 0.01, desc: '+1% Gewinnbonus beim Zocken' },
  { id: 'hufeisen',  name: 'Hufeisen',          icon: '🧿', odds: 10000,  max: 10, type: 'all',    bonus: 0.10, desc: '+10% auf alles' },
  { id: 'regenbogen',name: 'Regenbogen-Chip',   icon: '🌈', odds: 25000,  max: 5,  type: 'value',  bonus: 0.25, desc: '+25% Münzwert' },
  { id: 'nadel',     name: 'Diamant-Nadel',     icon: '💎', odds: 100000, max: 5,  type: 'allx',   bonus: 2,    desc: '×2 auf alles (die Nadel im Heuhaufen!)' },
];

// ─── Skills (leveln durch Benutzen) ────────────────────────────────────────
export const SKILLS = {
  suchen:     { name: 'Sammeln',    icon: '🫳', base: 15, growth: 1.2,  desc: (l) => `Münzen +${l * 2}% · Münzwert ×${Math.pow(1.05, l).toFixed(2)}` },
  management: { name: 'Management', icon: '📊', base: 3,  growth: 1.2,  desc: (l) => `Helfer-Tempo +${l * 5}%` },
  zocken:     { name: 'Zocken',     icon: '🎲', base: 10, growth: 1.15, desc: (l) => `Gewinnbonus +${(Math.min(0.05, l * 0.002) * 100).toFixed(1)}%` },
};
export const xpForLevel = (skill, level) => Math.floor(SKILLS[skill].base * Math.pow(SKILLS[skill].growth, level));

// ─── Grundwerte ────────────────────────────────────────────────────────────
export const BASE_SPAWN = 1.0;       // Münzen pro Sekunde am Anfang
export const SPAWN_CAP = 3.5;        // mehr passt nicht auf den Boden – Überschuss wird zu Münzwert
export const MAX_ON_FLOOR = 10;
export const COIN_LIFETIME = 6.5;    // Sekunden, bis eine Münze verschwindet
export const GOLD_CHANCE = 0.02;     // 2% der Münzen sind Goldmünzen
export const GOLD_MULT = 25;
export const GOLD_LIFETIME = 2.8;
export const CHARM_LIFETIME = 4;
export const OFFLINE_CAP_SEC = 8 * 3600;
export const COMBO_WINDOW_MS = 1600;  // so schnell muss die nächste Münze folgen
export const COMBO_STEP = 0.05;       // +5% pro Combo-Stufe
export const COMBO_MAX = 20;          // max. ×2
export const FRENZY_MULT = 5;         // Geldregen: 5× so viele Münzen
export const FRENZY_SEC = 20;
export const SACK_MIN_SEC = 75;       // Geldsack erscheint alle 75–150 s
export const SACK_MAX_SEC = 150;
export const WHEEL_COOLDOWN_MS = 8 * 60 * 1000;
export const ACHIEVEMENT_BONUS = 0.02; // jeder Erfolg: +2% auf alles

// ─── Erfolge ───────────────────────────────────────────────────────────────
const helperTotal = (s) => Object.values(s.helpers).reduce((a, b) => a + b, 0);
const charmTotal = (s) => Object.values(s.charms).reduce((a, b) => a + b, 0);
export const ACHIEVEMENTS = [
  { id: 'cent1',    icon: '🪙', name: 'Der erste Cent',      desc: 'Heb deine erste Münze auf',        test: s => s.stats.finds >= 1 },
  { id: 'cent100',  icon: '👛', name: 'Kleingeld-Sammler',   desc: '100 Münzen aufgehoben',            test: s => s.stats.finds >= 100 },
  { id: 'cent1k',   icon: '💰', name: 'Münzjäger',           desc: '1.000 Münzen aufgehoben',          test: s => s.stats.finds >= 1000 },
  { id: 'cent10k',  icon: '🏦', name: 'Lebender Staubsauger', desc: '10.000 Münzen aufgehoben',        test: s => s.stats.finds >= 10000 },
  { id: 'gold1',    icon: '🥇', name: 'Goldrausch',          desc: 'Erste Goldmünze erwischt',         test: s => s.stats.goldChips >= 1 },
  { id: 'gold50',   icon: '👑', name: 'Goldfinger',          desc: '50 Goldmünzen erwischt',           test: s => s.stats.goldChips >= 50 },
  { id: 'combo10',  icon: '🔥', name: 'Flinke Finger',       desc: 'Combo ×10 erreicht',               test: s => (s.stats.maxCombo || 0) >= 10 },
  { id: 'combo20',  icon: '⚡', name: 'Unaufhaltsam',        desc: 'Maximale Combo ×20 erreicht',      test: s => (s.stats.maxCombo || 0) >= 20 },
  { id: 'earn100',  icon: '💶', name: 'Taschengeld',         desc: '100 € verdient',                   test: s => s.stats.totalEarned >= 100 },
  { id: 'earn1m',   icon: '💸', name: 'Millionär',           desc: '1 Mio € verdient',                 test: s => s.stats.totalEarned >= 1e6 },
  { id: 'earn1b',   icon: '🤑', name: 'Milliardär',          desc: '1 Mrd € verdient',                 test: s => s.stats.totalEarned >= 1e9 },
  { id: 'earn1t',   icon: '🏰', name: 'Billionär',           desc: '1 Bio € verdient',                 test: s => s.stats.totalEarned >= 1e12 },
  { id: 'loc1',     icon: '🍺', name: 'Stammgast',           desc: 'Zieh in die Eckkneipe',            test: s => s.location >= 1 },
  { id: 'loc2',     icon: '🕹️', name: 'Zocker-Kid',          desc: 'Zieh in die Stadt-Spielhalle',     test: s => s.location >= 2 },
  { id: 'loc3',     icon: '🏛️', name: 'Smoking-Pflicht',     desc: 'Zieh ins Stadt-Casino',            test: s => s.location >= 3 },
  { id: 'loc4',     icon: '🌴', name: 'Viva Las Vegas',      desc: 'Zieh nach Las Vegas',              test: s => s.location >= 4 },
  { id: 'loc5',     icon: '🛥️', name: 'Jetset',              desc: 'Zieh nach Monaco',                 test: s => s.location >= 5 },
  { id: 'loc6',     icon: '🌙', name: 'Zum Mond!',           desc: 'Eröffne das Mond-Casino',          test: s => s.location >= 6 },
  { id: 'help10',   icon: '🧹', name: 'Kleiner Betrieb',     desc: '10 Helfer eingestellt',            test: s => helperTotal(s) >= 10 },
  { id: 'help100',  icon: '🏢', name: 'Mittelstand',         desc: '100 Helfer eingestellt',           test: s => helperTotal(s) >= 100 },
  { id: 'help500',  icon: '🌆', name: 'Konzern',             desc: '500 Helfer eingestellt',           test: s => helperTotal(s) >= 500 },
  { id: 'tools10',  icon: '🧰', name: 'Werkzeugkiste',       desc: '10 Werkzeuge gekauft',             test: s => s.tools.length >= 10 },
  { id: 'charm1',   icon: '🍀', name: 'Glückspilz',          desc: 'Ersten Glücksbringer gefangen',    test: s => charmTotal(s) >= 1 },
  { id: 'nadel',    icon: '💎', name: 'Nadel im Heuhaufen',  desc: 'Die Diamant-Nadel gefunden',       test: s => (s.charms.nadel || 0) >= 1 },
  { id: 'sack1',    icon: '💼', name: 'Sack gefunden!',      desc: 'Ersten Geldsack geschnappt',       test: s => (s.stats.sacks || 0) >= 1 },
  { id: 'sack25',   icon: '🎒', name: 'Sackträger',          desc: '25 Geldsäcke geschnappt',          test: s => (s.stats.sacks || 0) >= 25 },
  { id: 'bet1',     icon: '🎲', name: 'Erste Wette',         desc: 'Spiel eine Runde im Casino',       test: s => s.stats.bets >= 1 },
  { id: 'bet500',   icon: '🎰', name: 'Stammspieler',        desc: '500 Runden im Casino',             test: s => s.stats.bets >= 500 },
  { id: 'bigwin',   icon: '🎆', name: 'BIG WIN!',            desc: 'Gewinne ×10 oder mehr',            test: s => (s.stats.bigWins || 0) >= 1 },
  { id: 'wheel1',   icon: '🎡', name: 'Dreh am Rad',         desc: 'Dreh das Glücksrad',               test: s => (s.stats.wheelSpins || 0) >= 1 },
];
export const newAchievements = (s) => ACHIEVEMENTS.filter(a => !(s.achievements || []).includes(a.id) && a.test(s));
export const unlockAchievements = (s, list) => ({ ...s, achievements: [...(s.achievements || []), ...list.map(a => a.id)] });

// ─── Geldsack & Glücksrad ──────────────────────────────────────────────────
// „So viel verdienst du in X Sekunden“ – Grundlage für Belohnungen
export const earningsFor = (s, sec) => {
  const d = derive(s);
  return Math.max(0.25, (d.incomePerSec + d.manualPerSec * 0.7) * sec);
};
export const openSack = (s, rng = Math.random, now = Date.now()) => {
  const st = { ...s.stats, sacks: (s.stats.sacks || 0) + 1 };
  if (rng() < 0.55) {
    return { state: { ...s, stats: st, frenzyUntil: now + FRENZY_SEC * 1000 }, result: { kind: 'frenzy' } };
  }
  const amount = earningsFor(s, 90 + rng() * 90);
  return { state: earn({ ...s, stats: st }, amount), result: { kind: 'money', amount } };
};

export const WHEEL_PRIZES = [
  { id: 'small',  label: '2 Min',       icon: '💶', color: '#16a34a', weight: 30 },
  { id: 'frenzy', label: 'Geldregen',   icon: '🌧️', color: '#2563eb', weight: 18 },
  { id: 'big',    label: '10 Min',      icon: '💰', color: '#ca8a04', weight: 14 },
  { id: 'boost',  label: '2× Helfer',   icon: '⚡', color: '#7c3aed', weight: 16 },
  { id: 'small2', label: '3 Min',       icon: '💶', color: '#16a34a', weight: 14 },
  { id: 'charm',  label: 'Glücksbringer', icon: '🍀', color: '#db2777', weight: 6 },
  { id: 'jackpot',label: 'JACKPOT 1h',  icon: '👑', color: '#dc2626', weight: 2 },
];
export const spinWheel = (s, rng = Math.random, now = Date.now()) => {
  if ((s.wheelReadyAt || 0) > now) return null;
  const total = WHEEL_PRIZES.reduce((a, p) => a + p.weight, 0);
  let r = rng() * total; let index = 0;
  while (r >= WHEEL_PRIZES[index].weight) { r -= WHEEL_PRIZES[index].weight; index++; }
  const prize = WHEEL_PRIZES[index];
  let next = { ...s, wheelReadyAt: now + WHEEL_COOLDOWN_MS, stats: { ...s.stats, wheelSpins: (s.stats.wheelSpins || 0) + 1 } };
  let text = '';
  const secs = { small: 120, small2: 180, big: 600, jackpot: 3600 }[prize.id];
  if (secs) { const amount = earningsFor(s, secs); next = earn(next, amount); text = `+${fmtMoney(amount)}`; }
  if (prize.id === 'frenzy') { next.frenzyUntil = now + FRENZY_SEC * 1000; text = 'Geldregen! Ab zum Suchen!'; }
  if (prize.id === 'boost') { next.boostUntil = now + 5 * 60 * 1000; text = 'Helfer verdienen 5 Minuten doppelt!'; }
  if (prize.id === 'charm') {
    const open = CHARMS.filter(c => (s.charms[c.id] || 0) < c.max && c.odds <= 10000);
    if (open.length) { const c = open[Math.floor(rng() * open.length)]; next.charms = { ...s.charms, [c.id]: (s.charms[c.id] || 0) + 1 }; text = `${c.icon} ${c.name}!`; }
    else { const amount = earningsFor(s, 600); next = earn(next, amount); text = `+${fmtMoney(amount)}`; }
  }
  return { state: next, index, prize, text };
};

// ─── Zustand ───────────────────────────────────────────────────────────────
export const newGame = () => ({
  v: SAVE_VERSION,
  money: 0,
  location: 0,
  helpers: {},
  tools: [],
  charms: {},
  achievements: [],
  frenzyUntil: 0,   // Geldregen aktiv bis (ms)
  boostUntil: 0,    // doppeltes Helfer-Einkommen bis (ms)
  wheelReadyAt: 0,  // Glücksrad wieder drehbar ab (ms)
  skills: { suchen: { level: 0, xp: 0 }, management: { level: 0, xp: 0 }, zocken: { level: 0, xp: 0 } },
  stats: {
    totalEarned: 0, clicks: 0, searches: 0, finds: 0, goldChips: 0, maxCombo: 0, sacks: 0, wheelSpins: 0,
    bets: 0, betWins: 0, bigWins: 0, gambleProfit: 0, gambleWon: 0, biggestWin: 0, playTime: 0, startedAt: Date.now(),
  },
  savedAt: Date.now(),
});

// Fehlende Felder aus älteren Spielständen auffüllen
export const migrate = (s) => {
  const base = newGame();
  if (!s || typeof s !== 'object' || s.v !== SAVE_VERSION) return base;
  return {
    ...base, ...s,
    skills: { ...base.skills, ...(s.skills || {}) },
    stats: { ...base.stats, ...(s.stats || {}) },
    helpers: s.helpers || {}, tools: s.tools || [], charms: s.charms || {}, achievements: s.achievements || [],
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

export const derive = (s, now = Date.now()) => {
  const sk = s.skills;
  const allMult = toolMult(s, 'all') * (1 + charmSum(s, 'all')) * Math.pow(2, s.charms.nadel || 0)
    * (1 + (s.achievements || []).length * ACHIEVEMENT_BONUS);
  const frenzy = (s.frenzyUntil || 0) > now;
  const boost = (s.boostUntil || 0) > now;

  let spawnRate = BASE_SPAWN * toolMult(s, 'spawn') * (1 + sk.suchen.level * 0.02) * (1 + charmSum(s, 'spawn'));
  let overflow = 1;
  if (spawnRate > SPAWN_CAP) { overflow = spawnRate / SPAWN_CAP; spawnRate = SPAWN_CAP; }
  if (frenzy) spawnRate *= FRENZY_MULT;

  const valueMult = toolMult(s, 'value') * Math.pow(1.05, sk.suchen.level) * (1 + charmSum(s, 'value')) * overflow * allMult;
  const avg = avgCoin(s.location);

  const helperMult = toolMult(s, 'helper') * (1 + sk.management.level * 0.05) * (1 + charmSum(s, 'helper'));
  // Jeder Helfer sammelt die Münzsorten seines Heimatorts
  const helperRates = {};
  const helperIncome = {};
  let autoCoins = 0;
  let incomePerSec = 0;
  HELPERS.forEach(h => {
    const n = s.helpers[h.id] || 0;
    const r = n * h.speed * Math.pow(2, milestoneCount(n)) * helperMult;
    helperRates[h.id] = r;
    helperIncome[h.id] = r * avgCoin(h.loc) * valueMult;
    autoCoins += r;
    incomePerSec += helperIncome[h.id];
  });
  if (boost) { incomePerSec *= 2; Object.keys(helperIncome).forEach(k => { helperIncome[k] *= 2; }); }

  const pickMult = toolMult(s, 'pick');
  const pickPct = TOOLS.reduce((m, t) => (t.type === 'pickPct' && s.tools.includes(t.id) ? m + t.x : m), 0);
  const pickEV = avg * valueMult * pickMult * (1 + GOLD_CHANCE * (GOLD_MULT - 1)) + pickPct * incomePerSec;
  const winBonus = Math.min(0.10, Math.min(0.05, sk.zocken.level * 0.002) + charmSum(s, 'gamble'));
  const loc = LOCATIONS[s.location];

  return {
    spawnRate, valueMult, avgCoin: avg, coins: loc.coins.map(coinById),
    autoCoins, helperRates, helperIncome, helperMult, incomePerSec,
    pickMult, pickPct, pickEV, manualPerSec: spawnRate * pickEV, frenzy, boost,
    winBonus, maxBet: loc.maxBet, games: loc.games,
  };
};

// Was erscheint als Nächstes auf dem Boden? (Münze, Goldmünze oder Glücksbringer)
export const rollSpawn = (s, rng = Math.random) => {
  for (const c of [...CHARMS].reverse()) {
    if ((s.charms[c.id] || 0) >= c.max) continue;
    if (rng() < 1 / c.odds) return { type: 'charm', charm: c };
  }
  const ids = LOCATIONS[s.location].coins;
  let r = rng() * COIN_WEIGHTS.reduce((a, b) => a + b, 0);
  let idx = 0;
  while (r >= COIN_WEIGHTS[idx]) { r -= COIN_WEIGHTS[idx]; idx++; }
  return { type: 'coin', coin: coinById(ids[idx]), gold: rng() < GOLD_CHANCE };
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

// Eine Münze vom Boden aufheben
export const comboMult = (combo) => 1 + Math.min(combo, COMBO_MAX) * COMBO_STEP;
export const pickup = (s, coinId, gold = false, combo = 0) => {
  const d = derive(s);
  const coin = coinById(coinId);
  if (!coin) return null;
  const money = (coin.v * d.valueMult * d.pickMult * (gold ? GOLD_MULT : 1) + d.pickPct * d.incomePerSec) * comboMult(combo);
  const { skills, ups } = addXp(s.skills, 'suchen', 1);
  const next = earn({ ...s, skills }, money);
  next.stats = {
    ...next.stats, clicks: s.stats.clicks + 1, finds: s.stats.finds + 1, goldChips: s.stats.goldChips + (gold ? 1 : 0),
    maxCombo: Math.max(s.stats.maxCombo || 0, combo),
  };
  return { state: next, result: { money, gold, levelUp: ups > 0 ? skills.suchen.level : null } };
};

// Einen Glücksbringer vom Boden aufheben
export const pickCharm = (s, charmId) => {
  const c = CHARMS.find(x => x.id === charmId);
  if (!c || (s.charms[c.id] || 0) >= c.max) return null;
  return { ...s, charms: { ...s.charms, [c.id]: (s.charms[c.id] || 0) + 1 } };
};

// Klick ins Leere: nur Müll
export const randomJunk = (s, rng = Math.random) => {
  const list = LOCATIONS[s.location].junk;
  return list[Math.floor(rng() * list.length)];
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
export const recordBet = (s, didWin, amount, multiplier = 1) => {
  const { skills } = addXp(s.skills, 'zocken', 1);
  const st = s.stats;
  return {
    ...s, skills,
    stats: {
      ...st, bets: st.bets + 1, betWins: st.betWins + (didWin ? 1 : 0),
      bigWins: (st.bigWins || 0) + (didWin && multiplier >= 10 ? 1 : 0),
      gambleProfit: st.gambleProfit + (didWin ? amount : -amount),
      gambleWon: (st.gambleWon || 0) + (didWin ? amount : 0),
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
