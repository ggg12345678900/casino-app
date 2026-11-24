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
  { id: 'k100k', v: 1e5,  label: '100K', unit: '€',  kind: 'chip-mars',   size: 64 },
  { id: 'k1m',  v: 1e6,   label: '1M',   unit: '€',  kind: 'chip-space',  size: 66 },
  { id: 'k10m', v: 1e7,   label: '10M',  unit: '€',  kind: 'chip-void',   size: 66 },
  { id: 'k100m',v: 1e8,   label: '100M', unit: '€',  kind: 'chip-cosmic', size: 68 },
  { id: 'k1b',  v: 1e9,   label: '1B',   unit: '€',  kind: 'chip-rainbow',size: 70 },
];
// Häufigkeit der vier Münzsorten eines Ortes (von klein nach groß)
export const COIN_WEIGHTS = [50, 30, 15, 5];

// ─── Orte ──────────────────────────────────────────────────────────────────
// coins: welche vier Münzsorten hier herumliegen. games: Spiele, die hier NEU dazukommen.
export const LOCATIONS = [
  {
    id: 'hinterhof', name: 'Hinterhof-Spielhalle', icon: '🏚️', cost: 0, coins: ['c1', 'c2', 'c5', 'c10'], games: ['slots-hinterhof'],
    junk: ['Kronkorken', 'Kaugummi', 'Zigarettenstummel', 'Staub', 'Ein Knopf', 'Rattenkot', 'Kassenbon', 'Eine Socke', 'Glasscherbe'],
    desc: 'Ein dreckiger Hinterhof. Zwischen dem Müll liegt hier und da ein Cent.',
  },
  {
    id: 'kneipe', name: 'Eckkneipe', icon: '🍺', cost: 40, coins: ['c5', 'c10', 'c20', 'c50'], games: ['slots-kneipe', 'dice', 'mines'],
    junk: ['Bierdeckel', 'Erdnussschale', 'Feuerzeug', 'Klebriger Fleck', 'Dartpfeil', 'Leeres Glas', 'Bierflaschendeckel'],
    desc: 'Klebriger Boden, betrunkene Gäste – hier fällt öfter mal Kleingeld runter. Würfeln erlaubt!',
  },
  {
    id: 'spielhalle', name: 'Stadt-Spielhalle', icon: '🕹️', cost: 3e5, coins: ['c20', 'c50', 'e1', 'e2'], games: ['slots-spielhalle', 'plinko', 'crash'],
    junk: ['Popcorn', 'Token-Attrappe', 'Kaputter Joystick', 'Gewinnlos (Niete)', 'Strohhalm', 'Kassenzettel'],
    desc: 'Neonlicht und blinkende Automaten. Hier rollen Euro-Münzen. Mines und Plinko warten.',
  },
  {
    id: 'casino', name: 'Stadt-Casino', icon: '🏛️', cost: 3e8, coins: ['e1', 'e2', 'k5', 'k10'], games: ['slots-casino', 'roulette', 'blackjack'],
    junk: ['Visitenkarte', 'Manschettenknopf', 'Olive', 'Cocktailschirmchen', 'Verlorener Ohrring', 'Zahnstocher'],
    desc: 'Roter Teppich, Smoking-Pflicht. Die ersten echten Casino-Chips liegen herum.',
  },
  {
    id: 'vegas', name: 'Las Vegas', icon: '🌴', cost: 6e9, coins: ['k5', 'k10', 'k25', 'k100'], games: ['slots-vegas', 'chicken'],
    junk: ['Elvis-Perücke', 'Hochzeitsring (Plastik)', 'Show-Ticket', 'Sonnenbrille', 'Federboa', 'Glitzerkonfetti'],
    desc: 'Die Stadt, die niemals schläft. Chips bis 100 €. Blackjack und Chicken freigeschaltet.',
  },
  {
    id: 'monaco', name: 'Monaco', icon: '🛥️', cost: 3e11, coins: ['k25', 'k100', 'k500', 'k1k'], games: ['slots-monaco', 'pump'],
    junk: ['Kaviar-Löffel', 'Yachtschlüssel (Attrappe)', 'Champagnerkorken', 'Rolex-Box (leer)', 'Seidentuch'],
    desc: 'Yachten, Adel und Milliardäre. Hier liegen 1000-€-Chips unterm Tisch.',
  },
  {
    id: 'mond', name: 'Mond-Casino', icon: '🌙', cost: 1.5e16, coins: ['k500', 'k1k', 'k5k', 'k25k'], games: ['slots-mond'],
    junk: ['Mondstaub', 'Astronautennahrung', 'Kleiner Krater', 'Verlorene Antenne', 'Mondgestein'],
    desc: 'Das exklusivste Casino der Erde – na ja, fast. Schwerelose 25.000-€-Chips.',
  },
  {
    id: 'mars', name: 'Mars-Casino', icon: '🔴', cost: 1e17, coins: ['k5k', 'k25k', 'k100k', 'k1m'], games: ['slots-mars'],
    junk: ['Roter Staub', 'Rover-Reifenspur', 'Marsgestein', 'Eiskristall', 'Verlorener Helm'],
    desc: 'Rote Wüste, Kuppel-Casino, Millionen-Chips im Staub.',
  },
  {
    id: 'station', name: 'Raumstation Orbit', icon: '🛰️', cost: 2e21, coins: ['k25k', 'k100k', 'k1m', 'k10m'], games: ['slots-station'],
    junk: ['Schwebende Schraube', 'Weltraum-Eis', 'Kabelbinder', 'Funkspruch', 'Kondenswasser'],
    desc: 'Casino in der Schwerelosigkeit – die Chips schweben dir entgegen.',
  },
  {
    id: 'blackhole', name: 'Schwarzes Loch', icon: '🕳️', cost: 4e26, coins: ['k100k', 'k1m', 'k10m', 'k100m'], games: ['slots-blackhole'],
    junk: ['Verbogenes Licht', 'Zeitschleife', 'Spaghettifizierter Löffel', 'Gravitationswelle'],
    desc: 'Hier krümmt sich sogar das Geld. Was reinfällt, kommt nie wieder raus – außer zu dir.',
  },
  {
    id: 'multiverse', name: 'Paralleluniversum', icon: '🌌', cost: 8e27, coins: ['k1m', 'k10m', 'k100m', 'k1b'], games: ['slots-multiverse'],
    junk: ['Dein anderes Ich', 'Ein Paradox', 'Gestern', 'Unendlichkeit (leer)'],
    desc: 'Unendlich viele Casinos – und alle gehören dir. Das Ende der Reise?',
  },
];
export const coinById = (id) => COINS.find(c => c.id === id);
// Alle Spiele bis einschließlich Ort idx
export const gamesUpTo = (idx) => LOCATIONS.slice(0, idx + 1).flatMap(l => l.games);
export const gameUnlockLoc = (g) => LOCATIONS.findIndex(l => l.games.includes(g));
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
  { id: 'spuerhund', name: 'Spürhund',     icon: '🐕', baseCost: 660,  speed: 2,    loc: 1, desc: 'Riecht Kleingeld aus zehn Metern.' },
  { id: 'tuersteher',name: 'Türsteher',    icon: '🕴️', baseCost: 1e6, speed: 15,   loc: 2, desc: 'Kassiert verlorene Münzen am Eingang ein.' },
  { id: 'croupier',  name: 'Croupier',     icon: '🎩', baseCost: 1e9,  speed: 70,   loc: 3, desc: 'Lässt beim Abräumen „versehentlich“ Chips fallen.' },
  { id: 'insider',   name: 'Insider',      icon: '🦹', baseCost: 2.5e10,  speed: 350,  loc: 4, desc: 'Kennt jede Ritze im Casino.' },
  { id: 'fee',       name: 'Glücksfee',    icon: '🧚', baseCost: 1.5e12, speed: 1800, loc: 5, desc: 'Zaubert Chips aus dem Nichts.' },
  { id: 'alien',     name: 'Alien-Scout',  icon: '👽', baseCost: 6e16, speed: 9000, loc: 6, desc: 'Scannt den Boden aus dem Orbit.' },
  { id: 'rover',     name: 'Mars-Rover',   icon: '🤖', baseCost: 4e17, speed: 45000, loc: 7, desc: 'Fährt rund um die Uhr Chips ein.' },
  { id: 'astronaut', name: 'Astronaut',    icon: '👨‍🚀', baseCost: 8e21, speed: 225000, loc: 8, desc: 'Fängt schwebende Chips mit dem Kescher.' },
  { id: 'graviton',  name: 'Gravitonsauger', icon: '🌀', baseCost: 1.6e27, speed: 1.1e6, loc: 9, desc: 'Saugt Chips aus dem Ereignishorizont.' },
  { id: 'doppel',    name: 'Doppelgänger', icon: '👥', baseCost: 3.2e28, speed: 5.5e6, loc: 10, desc: 'Du aus 1.000 Universen – alle sammeln für dich.' },
];
export const HELPER_COST_GROWTH = 1.2;
// Bei diesen Stückzahlen verdoppelt sich das Tempo eines Helfers
export const HELPER_MILESTONES = [25, 50, 100, 200, 400];

// ─── Werkzeuge (einmalige Upgrades) ────────────────────────────────────────
// type: spawn (mehr Münzen) | value (Münzwert) | pick (Wert beim Aufheben)
//       | helper | all   (der Münzwert hängt nur von Werkzeugen ab, nie von Helfern)
export const TOOLS = [
  { id: 'brille',     name: 'Brille',              icon: '👓', cost: 0.1, loc: 0, type: 'spawn',  x: 1.3, desc: 'Endlich scharf sehen – du entdeckst mehr Münzen.' },
  { id: 'handschuhe', name: 'Handschuhe',          icon: '🧤', cost: 1, loc: 0, type: 'value',  x: 2,   desc: 'Du traust dich jetzt auch in die Ecken.' },
  { id: 'lampe',      name: 'Taschenlampe',        icon: '🔦', cost: 4, loc: 0, type: 'spawn',  x: 1.3, desc: 'Licht unter den Automaten.' },
  { id: 'schaufel',   name: 'Kehrschaufel',        icon: '🥄', cost: 15,    loc: 0, type: 'pick',   x: 2,   desc: 'Du schaufelst mehrere Münzen auf einmal auf.' },
  { id: 'magnet',     name: 'Magnet',              icon: '🧲', cost: 500,   loc: 1, type: 'value',  x: 2,   desc: 'Zieht die Münzen aus jeder Ritze.' },
  { id: 'dienstplan', name: 'Dienstplan',          icon: '📋', cost: 2000,  loc: 1, type: 'helper', x: 2,   desc: 'Alle Helfer arbeiten doppelt so schnell.' },
  { id: 'detektor',   name: 'Metalldetektor',      icon: '📡', cost: 8000,  loc: 1, type: 'spawn',  x: 1.5, desc: 'Piep. Piep. PIEEEP!' },
  { id: 'klebe',      name: 'Klebehandschuhe',     icon: '🧤', cost: 3000,   loc: 1, type: 'pick',    x: 2.5,    desc: 'An dir bleibt jede Münze kleben. Aufheben ×2,5.' },
  { id: 'finger',     name: 'Fingerfertigkeit',    icon: '🤌', cost: 800,    loc: 1, type: 'pick',    x: 2,  desc: 'Jahrelanges Kronkorken-Schnippen zahlt sich aus. Aufheben ×2.' },
  { id: 'sauger',     name: 'Industriesauger',     icon: '🌪️', cost: 9.6e5, loc: 2, type: 'pick',   x: 3,   desc: 'Jeder Klick saugt 3× so viel auf.' },
  { id: 'roentgen',   name: 'Röntgenbrille',       icon: '🕶️', cost: 3.6e6,  loc: 2, type: 'value',  x: 2.5, desc: 'Sieht Münzen sogar in Hosentaschen.' },
  { id: 'rede',       name: 'Motivationsrede',     icon: '📢', cost: 1.2e7,  loc: 2, type: 'helper', x: 2,   desc: '„Wir sind eine Familie!“ – Helfer ×2.' },
  { id: 'zange',      name: 'Münzzange',           icon: '🗜️', cost: 90000,  loc: 2, type: 'pick',    x: 2,    desc: 'Profi-Werkzeug für Kleingeld. Aufheben ×2.' },
  { id: 'turbofinger',name: 'Turbo-Finger',        icon: '⚡', cost: 1.5e5,  loc: 2, type: 'pick',    x: 3,    desc: 'Arcade-Reflexe: schneller als jeder Joystick. Aufheben ×3.' },
  { id: 'saugrohr',   name: 'Münz-Saugrohr',       icon: '🧪', cost: 1.2e6, loc: 2, type: 'pick',    x: 2,    desc: 'Schlürft Münzen direkt vom Teppich. Aufheben ×2.' },
  { id: 'rechen',     name: 'Münzrechen',          icon: '🧹', cost: 4.5e6,   loc: 2, type: 'pick',    x: 2,    desc: 'Harkt ganze Münzhaufen auf einmal zusammen. Aufheben ×2.' },
  { id: 'drohne',     name: 'Such-Drohne',         icon: '🚁', cost: 1.2e9,  loc: 3, type: 'pick',    x: 1.5,    desc: 'Fliegt dir voraus und zeigt dir die besten Münzen. Aufheben ×1,5.' },
  { id: 'satellit',   name: 'Satelliten-Scan',     icon: '🛰️', cost: 6e9,  loc: 3, type: 'spawn',  x: 1.5, desc: 'Mehr Münzen – aus dem All entdeckt.' },
  { id: 'firmenwagen',name: 'Firmenwagen',         icon: '🚗', cost: 3e10,  loc: 3, type: 'helper', x: 3,   desc: 'Helfer kommen schneller zur Arbeit. ×3' },
  { id: 'pfanne',     name: 'Goldgräberpfanne',    icon: '🍳', cost: 1.1e9,   loc: 3, type: 'pick',    x: 1.5,    desc: 'Gold waschen wie 1849. Aufheben ×1,5.' },
  { id: 'ki',         name: 'KI-Analyse',          icon: '🧠', cost: 3e10,  loc: 4, type: 'value',  x: 4,   desc: 'Berechnet, wo die wertvollsten Chips fallen.' },
  { id: 'greifer',    name: 'Präzisionsgreifer',   icon: '🦾', cost: 1.8e11,  loc: 4, type: 'pick',   x: 3,  desc: 'Greift jeden Chip millimetergenau. Aufheben ×3.' },
  { id: 'magnethand', name: 'Magnethandschuh',     icon: '🧲', cost: 1.3e10,  loc: 4, type: 'pick',    x: 3,    desc: 'Chips fliegen dir in die Hand. Aufheben ×3.' },
  { id: 'kredit',     name: 'Bankkredit',          icon: '🏦', cost: 9e11, loc: 4, type: 'helper', x: 3,   desc: 'Mehr Budget, mehr Leute. Helfer ×3.' },
  { id: 'kugel',      name: 'Kristallkugel',       icon: '🔮', cost: 2e13, loc: 5, type: 'value',  x: 2,   desc: 'Du weißt, wo der nächste Chip fällt.' },
  { id: 'zeit',       name: 'Zeitmaschine',        icon: '⏳', cost: 5e13, loc: 5, type: 'helper', x: 2,   desc: 'Helfer arbeiten in mehreren Zeitlinien. ×2' },
  { id: 'diamantgreifer', name: 'Diamantgreifer',  icon: '💍', cost: 8e12,  loc: 5, type: 'pick',    x: 3,    desc: 'Der edelste Griff der Riviera. Aufheben ×3.' },
  { id: 'zeitlupe',   name: 'Zeitlupe',            icon: '🐌', cost: 3e13,  loc: 5, type: 'pick',    x: 3,    desc: 'Für dich vergeht die Zeit langsamer. Aufheben ×3.' },
  { id: 'meteor',     name: 'Meteoriten-Detektor', icon: '☄️', cost: 2.5e17, loc: 6, type: 'value',  x: 5,   desc: 'Findet Chips aus Sternenstaub.' },
  { id: 'quantenhand',name: 'Quantenhand',         icon: '🫳', cost: 7.5e16,  loc: 6, type: 'pick',    x: 5,    desc: 'Deine Hand ist an mehreren Orten gleichzeitig. Aufheben ×5.' },
  { id: 'krone',      name: 'Mogul-Krone',         icon: '👑', cost: 2.5e18, loc: 6, type: 'all',    x: 10,  desc: 'Du bist der Casino-Mogul. Alles ×10.' },
  { id: 'marsbohrer', name: 'Mars-Bohrer',         icon: '⛏️', cost: 3.3e17,  loc: 7, type: 'value',  x: 4,   desc: 'Bohrt Chips aus dem roten Gestein.' },
  { id: 'raumanzug',  name: 'Raumanzug-Handschuh', icon: '🧤', cost: 2e17,  loc: 7, type: 'pick',   x: 4,   desc: 'Greift auch bei −60 °C. Aufheben ×4.' },
  { id: 'kolonie',    name: 'Mars-Kolonie',        icon: '🏘️', cost: 1.5e18,  loc: 7, type: 'helper', x: 3,   desc: 'Mehr Leute, mehr Hände. Helfer ×3.' },
  { id: 'traktor',    name: 'Traktorstrahl',       icon: '🔦', cost: 6e21,  loc: 8, type: 'pick',   x: 4,   desc: 'Zieht Chips aus der Schwerelosigkeit. Aufheben ×4.' },
  { id: 'solar',      name: 'Solarsegel',          icon: '☀️', cost: 1.6e22,  loc: 8, type: 'helper', x: 3,   desc: 'Unendliche Energie für deine Helfer. ×3' },
  { id: 'teleskop',   name: 'Weltraumteleskop',    icon: '🔭', cost: 3e22, loc: 8, type: 'value', x: 4,   desc: 'Sieht Chips in anderen Galaxien.' },
  { id: 'wurmloch',   name: 'Wurmloch-Hand',       icon: '🫴', cost: 1.2e27,  loc: 9, type: 'pick',   x: 5,   desc: 'Greift durch Raum und Zeit. Aufheben ×5.' },
  { id: 'singular',   name: 'Singularität',        icon: '⚫', cost: 4e27,  loc: 9, type: 'value',  x: 5,   desc: 'Unendliche Dichte – unendlicher Wert.' },
  { id: 'zeitdilat',  name: 'Zeitdilatation',      icon: '⌛', cost: 9.6e27,  loc: 9, type: 'helper', x: 4,   desc: 'Für deine Helfer vergeht die Zeit schneller. ×4' },
  { id: 'multihand',  name: 'Multiversum-Hand',    icon: '🖐️', cost: 2.4e28,  loc: 10, type: 'pick',  x: 6,   desc: 'Tausend Hände aus tausend Welten. Aufheben ×6.' },
  { id: 'ewigkeit',   name: 'Ewigkeits-Krone',     icon: '♾️', cost: 1.4e30,  loc: 10, type: 'all',   x: 10,  desc: 'Herrscher aller Universen. Alles ×10.' },
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

// ─── Münz-Sammelalbum: seltene Münzen, nur durch eigenes Antippen ──────────
// Jeder Ort hat ein Set aus 4 Stücken. Volles Set = dauerhaft +10 % Münzwert. Doppelte werden zu Jetons.
export const ALBUM_CHANCE = 1 / 300;      // pro angetippter Münze
export const ALBUM_SET_BONUS = 0.10;
export const ALBUM_DUP_JETONS = 3;
export const ALBUM = {
  hinterhof:  [['rostpfennig', '🟤', 'Rostiger Pfennig'], ['fehlpraegung', '⚠️', 'Fehlprägung'], ['kronkorkenm', '🍾', 'Kronkorken-Münze'], ['gluckscent', '🍀', 'Glücks-Cent']],
  kneipe:     [['deckeltaler', '🍺', 'Bierdeckel-Taler'], ['dartmuenze', '🎯', 'Dart-Münze'], ['stammgroschen', '🪙', 'Stammtisch-Groschen'], ['zapftoken', '🚰', 'Zapfhahn-Token']],
  spielhalle: [['arcadetoken', '👾', 'Arcade-Token'], ['pinball', '🕹️', 'Pinball-Münze'], ['neonchip', '💡', 'Neon-Chip'], ['highscore', '🏅', 'Highscore-Medaille']],
  casino:     [['denar', '🏛️', 'Römischer Denar'], ['goldtaler', '🥇', 'Goldener Taler'], ['plakette', '🎩', 'Croupier-Plakette'], ['royalchip', '👑', 'Royal-Chip']],
  vegas:      [['elvisdollar', '🕺', 'Elvis-Dollar'], ['neonwuerfel', '🎲', 'Neon-Würfel'], ['wuestenstern', '⭐', 'Wüstenstern'], ['showjeton', '💃', 'Show-Jeton']],
  monaco:     [['fuerstenm', '🏰', 'Fürsten-Münze'], ['yachtmedaille', '⛵', 'Yacht-Medaille'], ['perlenchip', '🦪', 'Perlen-Chip'], ['diamanttaler', '💎', 'Diamant-Taler']],
  mond:       [['mondstein', '🌙', 'Mondstein'], ['kratermuenze', '🌑', 'Krater-Münze'], ['apollo', '🚀', 'Apollo-Medaille'], ['sternchip', '🌟', 'Sternen-Chip']],
  mars:       [['staubtaler', '🔴', 'Roter Staubtaler'], ['roverchip', '🤖', 'Rover-Chip'], ['olympus', '⛰️', 'Olympus-Münze'], ['ufotoken', '🛸', 'UFO-Token']],
  station:    [['schwerelos', '🪐', 'Schwerelos-Münze'], ['funktoken', '📡', 'Funk-Token'], ['andock', '🛰️', 'Andock-Medaille'], ['sauerstoff', '🫧', 'Sauerstoff-Chip']],
  blackhole:  [['horizont', '🕳️', 'Ereignishorizont'], ['zeitkristall', '⏳', 'Zeitkristall'], ['gravmuenze', '🌀', 'Gravitations-Münze'], ['dunklemat', '⚫', 'Dunkle Materie']],
  multiverse: [['paradox', '♾️', 'Paradox-Münze'], ['spiegeltaler', '🪞', 'Spiegel-Taler'], ['quantenchip', '⚛️', 'Quanten-Chip'], ['urmuenze', '🌌', 'Ur-Münze']],
};
export const albumPieces = (s) => Object.keys(s.album || {}).filter(k => (s.album[k] || 0) > 0).length;
export const albumSets = (s) => Object.values(ALBUM).filter(set => set.every(([id]) => ((s.album || {})[id] || 0) > 0)).length;
export const ALBUM_TOTAL = Object.values(ALBUM).reduce((a, set) => a + set.length, 0);

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
export const OFFLINE_CAP_SEC = 8 * 3600; // max. 8 h werden angerechnet
export const OFFLINE_RATE = 0.2;         // offline verdienen Helfer 20 % ihres normalen Einkommens
export const COMBO_WINDOW_MS = 1600;  // so schnell muss die nächste Münze folgen
export const COMBO_STEP = 0.05;       // +5% pro Combo-Stufe
export const COMBO_MAX = 20;          // Bonus wächst bis Combo 20 (= +100 %), die Combo selbst zählt unbegrenzt weiter
export const COMBO_MILESTONES = [50, 100, 250, 500, 1000, 2500, 5000];
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
  { id: 'combo20',  icon: '⚡', name: 'Unaufhaltsam',        desc: 'Combo ×20 – voller +100 %-Bonus',  test: s => (s.stats.maxCombo || 0) >= 20 },
  { id: 'combo100', icon: '☄️', name: 'Klick-Maschine',      desc: 'Combo ×100 erreicht',              test: s => (s.stats.maxCombo || 0) >= 100 },
  { id: 'combo500', icon: '🌋', name: 'Combo-Legende',       desc: 'Combo ×500 erreicht',              test: s => (s.stats.maxCombo || 0) >= 500 },
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
  { id: 'loc7',     icon: '🔴', name: 'Roter Planet',        desc: 'Eröffne das Mars-Casino',          test: s => s.location >= 7 },
  { id: 'loc8',     icon: '🛰️', name: 'Schwerelos reich',    desc: 'Zieh auf die Raumstation',         test: s => s.location >= 8 },
  { id: 'loc9',     icon: '🕳️', name: 'Ereignishorizont',    desc: 'Erreiche das Schwarze Loch',       test: s => s.location >= 9 },
  { id: 'loc10',    icon: '🌌', name: 'Herrscher des Multiversums', desc: 'Erreiche das Paralleluniversum', test: s => s.location >= 10 },
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
  { id: 'jackpot1', icon: '💰', name: 'JACKPOT!',            desc: 'Knack den progressiven Jackpot',   test: s => (s.stats.jackpots || 0) >= 1 },
  { id: 'vip10',    icon: '💳', name: 'Platin-Kunde',        desc: 'VIP-Stufe 10 erreicht',            test: s => (s.vip || 0) >= 10 },
  // ── Höhere Stufen zum Grinden ──
  { id: 'cent100k', icon: '🌪️', name: 'Münz-Tornado',         desc: '100.000 Münzen aufgehoben',        test: s => s.stats.finds >= 1e5 },
  { id: 'cent1m',   icon: '🌍', name: 'Alles meins',          desc: '1.000.000 Münzen aufgehoben',      test: s => s.stats.finds >= 1e6 },
  { id: 'gold500',  icon: '🏆', name: 'Goldgräber',           desc: '500 Goldmünzen erwischt',          test: s => s.stats.goldChips >= 500 },
  { id: 'gold5k',   icon: '💛', name: 'König Midas',          desc: '5.000 Goldmünzen erwischt',        test: s => s.stats.goldChips >= 5000 },
  { id: 'combo1k',  icon: '💥', name: 'Tausendfüßler',        desc: 'Combo ×1.000 erreicht',            test: s => (s.stats.maxCombo || 0) >= 1000 },
  { id: 'combo5k',  icon: '🌠', name: 'Unmenschlich',         desc: 'Combo ×5.000 erreicht',            test: s => (s.stats.maxCombo || 0) >= 5000 },
  { id: 'earn1q',   icon: '🏯', name: 'Billiardär',           desc: '1 Brd € verdient',                 test: s => s.stats.totalEarned >= 1e15 },
  { id: 'earn1e18', icon: '🪐', name: 'Trillionär',           desc: '1 Trio € verdient',                test: s => s.stats.totalEarned >= 1e18 },
  { id: 'earn1e24', icon: '🌌', name: 'Jenseits aller Zahlen', desc: '1 Qua € verdient',                test: s => s.stats.totalEarned >= 1e24 },
  { id: 'help2k',   icon: '🏙️', name: 'Weltkonzern',          desc: '2.000 Helfer eingestellt',         test: s => helperTotal(s) >= 2000 },
  { id: 'help10k',  icon: '🌐', name: 'Helfer-Imperium',      desc: '10.000 Helfer eingestellt',        test: s => helperTotal(s) >= 10000 },
  { id: 'tools30',  icon: '🛠️', name: 'Werkstatt-Meister',    desc: '30 Werkzeuge gekauft',             test: s => s.tools.length >= 30 },
  { id: 'sack100',  icon: '💰', name: 'Sack-Sammler',         desc: '100 Geldsäcke geschnappt',         test: s => (s.stats.sacks || 0) >= 100 },
  { id: 'sack500',  icon: '🏦', name: 'Tresor auf Beinen',    desc: '500 Geldsäcke geschnappt',         test: s => (s.stats.sacks || 0) >= 500 },
  { id: 'bet5k',    icon: '🎰', name: 'Dauerzocker',          desc: '5.000 Runden im Casino',           test: s => s.stats.bets >= 5000 },
  { id: 'bet25k',   icon: '🃏', name: 'Casino-Inventar',      desc: '25.000 Runden im Casino',          test: s => s.stats.bets >= 25000 },
  { id: 'bigwin25', icon: '🎇', name: 'Glückskind',           desc: '25 Gewinne ×10 oder mehr',         test: s => (s.stats.bigWins || 0) >= 25 },
  { id: 'bigwin250',icon: '🎆', name: 'Big-Win-Maschine',     desc: '250 Gewinne ×10 oder mehr',        test: s => (s.stats.bigWins || 0) >= 250 },
  { id: 'wheel50',  icon: '🎡', name: 'Radprofi',             desc: '50× das Glücksrad gedreht',        test: s => (s.stats.wheelSpins || 0) >= 50 },
  { id: 'wheel250', icon: '🌀', name: 'Rad-Legende',          desc: '250× das Glücksrad gedreht',       test: s => (s.stats.wheelSpins || 0) >= 250 },
  { id: 'jackpot5', icon: '💎', name: 'Jackpot-Jäger',        desc: '5 Jackpots geknackt',              test: s => (s.stats.jackpots || 0) >= 5 },
  { id: 'vip20',    icon: '🖤', name: 'Black Card',           desc: 'VIP-Stufe 21 erreicht',            test: s => (s.vip || 0) >= 21 },
  { id: 'jet100',   icon: '🟣', name: 'Jeton-Sammler',        desc: '100 Jetons verdient',              test: s => (s.stats.jetonsEarned || 0) >= 100 },
  { id: 'jet1k',    icon: '🔮', name: 'Jeton-Baron',          desc: '1.000 Jetons verdient',            test: s => (s.stats.jetonsEarned || 0) >= 1000 },
  { id: 'jet10k',   icon: '👾', name: 'Jeton-Imperator',      desc: '10.000 Jetons verdient',           test: s => (s.stats.jetonsEarned || 0) >= 10000 },
  { id: 'album1',   icon: '📖', name: 'Sammler',              desc: 'Erstes Album-Stück gefunden',      test: s => albumPieces(s) >= 1 },
  { id: 'albumset1',icon: '📚', name: 'Erstes Set',           desc: 'Ein Album-Set komplett',           test: s => albumSets(s) >= 1 },
  { id: 'albumset5',icon: '🗃️', name: 'Numismatiker',         desc: '5 Album-Sets komplett',            test: s => albumSets(s) >= 5 },
  { id: 'albumall', icon: '🏛️', name: 'Museum',               desc: 'Das ganze Album komplett',         test: s => albumPieces(s) >= ALBUM_TOTAL },
];
// Stufe (1 Bronze … 5 Diamant) für die Anzeige
const TIER_OF = {
  cent1: 1, cent100: 1, cent1k: 2, cent10k: 3, cent100k: 4, cent1m: 5, gold1: 1, gold50: 2, gold500: 3, gold5k: 5,
  combo10: 1, combo20: 2, combo100: 3, combo500: 4, combo1k: 4, combo5k: 5, earn100: 1, earn1m: 2, earn1b: 3, earn1t: 3, earn1q: 4, earn1e18: 4, earn1e24: 5,
  help10: 1, help100: 2, help500: 3, help2k: 4, help10k: 5, tools10: 2, tools30: 4, sack1: 1, sack25: 2, sack100: 3, sack500: 4,
  bet1: 1, bet500: 2, bet5k: 3, bet25k: 5, bigwin: 1, bigwin25: 3, bigwin250: 5, wheel1: 1, wheel50: 3, wheel250: 4, jackpot1: 3, jackpot5: 5,
  vip10: 3, vip20: 5, jet100: 1, jet1k: 3, jet10k: 5, album1: 1, albumset1: 2, albumset5: 4, albumall: 5, charm1: 1, nadel: 5,
  loc1: 1, loc2: 1, loc3: 2, loc4: 2, loc5: 3, loc6: 3, loc7: 4, loc8: 4, loc9: 5, loc10: 5,
};
ACHIEVEMENTS.forEach(a => { a.tier = TIER_OF[a.id] || 1; });
export const TIERS = ['', 'Bronze', 'Silber', 'Gold', 'Platin', 'Diamant'];
// ─── Tutorial-Aufgaben ─────────────────────────────────────────────────────
// hl: Ziel des Spotlights. tip: kurzer Satz in der Sprechblase. guide: Spotlight sperrt den Rest
// (nur für kurze Klick-Schritte, nicht für Schritte, bei denen man länger spielen muss).
export const QUESTS = [
  { id: 'coins',  icon: '🪙', title: 'Heb 5 Münzen auf',          tip: 'Tippe die Münzen an, bevor sie verschwinden!', hint: 'Münzen tauchen auf dem Boden auf und verschwinden nach ein paar Sekunden.', hl: 'floor', guide: true, reward: 0.2, progress: s => s.stats.finds / 5 },
  { id: 'brille', icon: '👓', title: 'Kauf die Brille',           tip: 'Kauf die Brille – damit siehst du mehr Münzen.', hint: 'Werkzeuge machen dein Sammeln besser.', hl: 'tool-brille', guide: true, reward: 0.3, progress: s => (s.tools.includes('brille') ? 1 : Math.min(0.99, s.money / 0.1)) },
  { id: 'helfer', icon: '🧹', title: 'Stell eine Putzkraft ein',  tip: 'Stell eine Putzkraft ein – sie sammelt für dich, auch wenn du nicht tippst.', hint: 'Helfer sammeln automatisch Münzen für dich.', hl: 'helper-putzkraft', guide: true, reward: 0.5, progress: s => ((s.helpers.putzkraft || 0) >= 1 ? 1 : Math.min(0.99, s.money / 0.5)) },
  { id: 'combo',  icon: '🔥', title: 'Schaff eine Combo ×3',      tip: 'Tippe 3 Münzen schnell hintereinander – das gibt Combo-Bonus!', hint: 'Jede Combo-Stufe gibt +5 % Wert.', hl: 'floor', guide: true, reward: 1, progress: s => (s.stats.maxCombo || 0) / 3 },
  { id: 'slots',  icon: '🎰', title: 'Spiel eine Runde am Automaten', tip: 'Dein erster Automat! Dreh eine Runde.', hint: 'Im Casino kannst du dein Geld vermehren – oder verlieren.', hl: 'game-slot', guide: true, reward: 2, progress: s => (s.stats.bets >= 1 ? 1 : 0) },
  { id: 'wheel',  icon: '🎡', title: 'Dreh das Glücksrad',        tip: 'Alle 8 Minuten gratis: Dreh das Glücksrad!', hint: 'Das Glücksrad findest du in der Casino-Lobby.', hl: 'wheel', guide: true, reward: 2, progress: s => ((s.stats.wheelSpins || 0) >= 1 ? 1 : 0) },
  { id: 'kneipe', icon: '🍺', title: 'Zieh in die Eckkneipe',     tip: 'Spar 40 € und zieh um!', hint: 'Spar 40 € und tippe dann auf „Umziehen“. Dort gibt es mehr Geld und neue Spiele.', hl: 'goal', guide: false, reward: 10, progress: s => (s.location >= 1 ? 1 : Math.min(0.99, s.money / 40)) },
  // Kapitel 2 in der Eckkneipe: Jetons
  { id: 'jeton1', icon: '🟣', title: 'Sammle deinen ersten Jeton', tip: 'Neu: Jede 25. Münze bringt einen Jeton 🟣', hint: 'Jetons sind die Casino-Währung. Jede angetippte Münze füllt die lila Leiste unter dem Boden – Helfer zählen nicht.', hl: 'jetonbar', guide: false, reward: 0, rewardJ: 25,
    progress: s => ((s.stats.jetonsEarned || 0) >= 1 ? 1 : Math.min(0.99, (s.jetonProgress || 0) / JETON_PER_COINS)) },
  { id: 'jshop', icon: '🛒', title: 'Kauf ein Freispiel-Paket', tip: 'Im Jeton-Shop gibt es Extras fürs Casino. Hol dir 10 Gratis-Spins!', hint: 'Der Jeton-Shop steht in der Casino-Lobby unter den Spielen.', hl: 'jitem-freepack', guide: true, reward: 5,
    progress: s => ((s.bonusSpins || 0) > 0 || (s.stats.bonusUsed || 0) > 0 ? 1 : 0) },
  { id: 'bonus', icon: '🎁', title: 'Starte deine Gratis-Spins', tip: 'Tippe hier, um deine Gratis-Spins zu starten!', hint: 'Am Automaten der Kneipe.', hl: 'bonus', guide: true, reward: 10,
    progress: s => ((s.stats.bonusUsed || 0) > 0 ? 1 : 0) },
];
// Jetons gibt es erst ab der Eckkneipe (vorher ist davon nichts zu sehen)
export const jetonsOn = (s) => (s.location || 0) >= 1 || !!s.tutorialSkipped;
// Was ist schon sichtbar? Schritt für Schritt mit dem Tutorial (Wert = nötige Zahl erledigter Aufgaben)
export const UNLOCK_AT = { tools: 1, helpers: 2, casino: 4, wheel: 5, vip: 5, locations: 6, extras: 6 };
export const UNLOCK_INFO = {
  tools: { icon: '🛠️', name: 'Werkzeuge' }, helpers: { icon: '👥', name: 'Helfer' }, casino: { icon: '🎰', name: 'Casino & Jetons 🟣' },
  wheel: { icon: '🎡', name: 'Glücksrad & VIP-Karte' }, locations: { icon: '🗺️', name: 'Orte' }, extras: { icon: '🏆', name: 'Erfolge, Rangliste & Statistik' },
};
export const isUnlocked = (s, key) => !!s.tutorialSkipped || (s.quest || 0) >= (UNLOCK_AT[key] ?? 0) || (s.location || 0) > 0;
// Diese Funktionen werden durch die erledigte Aufgabe i freigeschaltet
export const unlocksAfter = (i) => Object.keys(UNLOCK_AT).filter(k => UNLOCK_AT[k] === i + 1);
export const questDone = (s, i = s.quest) => i < QUESTS.length && QUESTS[i].progress(s) >= 1;
export const claimQuest = (s) => {
  const i = s.quest || 0;
  if (!questDone(s, i)) return null;
  const q = QUESTS[i];
  const paid = earn(s, q.reward);
  return { ...(q.rewardJ ? addJetons(paid, q.rewardJ) : paid), quest: i + 1 };
};

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
  { id: 'jetons', label: '10 Jetons',   icon: '🟣', color: '#9333ea', weight: 10 },
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
  if (prize.id === 'jetons') {
    if (jetonsOn(s)) { next = addJetons(next, 10); text = '+10 Jetons 🟣'; } else { const amount = earningsFor(s, 120); next = earn(next, amount); text = `+${fmtMoney(amount)}`; }
  }
  if (prize.id === 'frenzy') { next.frenzyUntil = now + FRENZY_SEC * 1000; text = 'Geldregen! Ab zum Sammeln!'; }
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
  vip: 0,          // VIP-Stufe: jede Stufe verdoppelt den Max-Einsatz
  jackpot: 0,      // progressiver Jackpot-Topf (0 = Startwert)
  frenzyUntil: 0,   // Geldregen aktiv bis (ms)
  boostUntil: 0,    // doppeltes Helfer-Einkommen bis (ms)
  wheelReadyAt: 0,  // Glücksrad wieder drehbar ab (ms)
  quest: 0,         // Tutorial-Aufgabe (Index in QUESTS)
  tutorialSkipped: false,
  jetons: 0,          // Casino-Währung
  jetonProgress: 0,   // angetippte Münzen bis zum nächsten Jeton
  jetonShop: {},      // gekaufte Jeton-Upgrades
  bonusSpins: 0,      // gekaufte Gratis-Spins
  jetonPot: 100,      // Jackpot des High-Roller-Automaten (in Jetons)
  insuranceReadyAt: 0,
  album: {},          // Sammelalbum: id -> Anzahl
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
  // Bestehende Spieler, die schon weit sind, überspringen das Tutorial
  const quest = typeof s.quest === 'number' ? s.quest : ((s.stats && s.stats.finds > 30) || (s.location || 0) > 0 ? QUESTS.length : 0);
  return {
    quest,
    ...base, ...s,
    skills: { ...base.skills, ...(s.skills || {}) },
    stats: { ...base.stats, ...(s.stats || {}) },
    helpers: s.helpers || {}, tools: s.tools || [], charms: s.charms || {}, achievements: s.achievements || [],
    jetonShop: { ...(s.jetonShop || {}), slotup: { ...((s.jetonShop || {}).slotup || {}) } },
    album: s.album || {},
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

  const valueMult = toolMult(s, 'value') * Math.pow(1.05, sk.suchen.level) * (1 + charmSum(s, 'value')) * overflow * allMult
    * (1 + albumSets(s) * ALBUM_SET_BONUS)
    * (1 + (s.vip || 0) * VIP_COIN_BONUS);
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
  const pickEV = avg * valueMult * pickMult * (1 + GOLD_CHANCE * (GOLD_MULT - 1));
  const js = s.jetonShop || {};
  const winBonus = Math.min(0.10, Math.min(0.05, sk.zocken.level * 0.002) + charmSum(s, 'gamble')) + (js.luck || 0) * LUCK_STEP;
  const loc = LOCATIONS[s.location];
  const slotLvl = (js.slotup || {})[loc.id] || 0;
  // Nur der Automat des aktuellen Orts steht im Casino – die alten haben keinen Platz mehr
  const games = gamesUpTo(s.location).filter(g => !g.startsWith('slots-') || g === `slots-${loc.id}`);
  // Max-Einsatz: steigt nur durch gekaufte VIP-Stufen (nicht durch Einkommen oder Umzug)
  const maxBet = vipLimit(s.vip || 0);

  return {
    spawnRate, valueMult, avgCoin: avg, coins: loc.coins.map(coinById),
    autoCoins, helperRates, helperIncome, helperMult, incomePerSec,
    pickMult, pickEV, manualPerSec: spawnRate * pickEV, frenzy, boost,
    winBonus, maxBet, games, loc,
    freeSpins: FREE_SPINS_BASE + slotLvl * 2, freeMult: FREE_MULT_BASE + slotLvl * 0.5, slotLvl, turbo: !!js.turbo,
  };
};

// Auf „runde“ Beträge abrunden: 1, 2, 5, 10, 20, 50 …
export const niceRound = (x) => {
  if (!(x > 0)) return 0;
  const p = Math.pow(10, Math.floor(Math.log10(x)));
  const m = x / p;
  return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p;
};

// ─── VIP-Karte: Einsatzlimit kaufen ────────────────────────────────────────
// Start 5 €, jede Stufe verdoppelt das Limit. Preis = 20× das neue Limit.
export const BET_BASE = 5;
export const VIP_COIN_BONUS = 0.05; // jede VIP-Stufe: +5 % Münzwert
export const VIP_PRICE_FACTOR = 20;
export const vipLimit = (lvl) => BET_BASE * Math.pow(2, lvl);
export const vipCostAt = (lvl) => vipLimit(lvl + 1) * VIP_PRICE_FACTOR;
const vipDisc = (s) => ((s.jetonShop || {}).vipdisc ? 0.9 : 1);
export const vipCost = (s) => vipCostAt(s.vip || 0) * vipDisc(s);
const VIP_TIERS = [[0, 'Gast'], [1, 'Bronze'], [3, 'Silber'], [6, 'Gold'], [10, 'Platin'], [15, 'Diamant'], [21, 'Black Card'], [30, 'Mogul']];
export const vipName = (lvl) => VIP_TIERS.filter(([min]) => lvl >= min).pop()[1];
export const vipTierIndex = (lvl) => VIP_TIERS.filter(([min]) => lvl >= min).length - 1;
// Wie viele Stufen kann man sich leisten? (Kosten verdoppeln sich je Stufe)
export const vipAffordable = (s) => {
  let lvl = s.vip || 0; let money = s.money; let n = 0;
  while (n < 200 && money >= vipCostAt(lvl) * vipDisc(s)) { money -= vipCostAt(lvl) * vipDisc(s); lvl++; n++; }
  return n;
};
export const buyVip = (s, count = 1) => {
  let lvl = s.vip || 0; let money = s.money;
  for (let i = 0; i < count; i++) {
    const c = vipCostAt(lvl) * vipDisc(s);
    if (money < c) break;
    money -= c; lvl++;
  }
  if (lvl === (s.vip || 0)) return null;
  return { ...s, money, vip: lvl };
};

// ─── Progressiver Jackpot ──────────────────────────────────────────────────
// Jede Wette zahlt 2% ein. Jede Runde kann ihn knacken (Chance steigt mit dem Einsatz),
// 7️⃣7️⃣7️⃣ am Spielautomaten knackt ihn immer.
export const JACKPOT_SHARE = 0.02;
export const JACKPOT_SEED_ONLINE = 1000; // Startwert des gemeinsamen Server-Topfs
export const JACKPOT_CHANCE = 1 / 2500;  // bei vollem Max-Einsatz
export const jackpotSeed = (s) => vipLimit(s.vip || 0) * 25;
export const jackpotPool = (s) => Math.max(s.jackpot || 0, jackpotSeed(s));
export const jackpotChance = (s, bet) => JACKPOT_CHANCE * Math.min(1, Math.max(0, bet) / vipLimit(s.vip || 0));

// Was erscheint als Nächstes auf dem Boden? (Münze, Goldmünze oder Glücksbringer)
export const rollSpawn = (s, rng = Math.random) => {
  for (const c of [...CHARMS].reverse()) {
    if ((s.charms[c.id] || 0) >= c.max) continue;
    if (rng() < 1 / c.odds) return { type: 'charm', charm: c };
  }
  if (jetonsOn(s) && rng() < JETON_COIN_CHANCE) return { type: 'jeton' };
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
export const pickup = (s, coinId, gold = false, combo = 0, rng = Math.random) => {
  const d = derive(s);
  const coin = coinById(coinId);
  if (!coin) return null;
  const money = coin.v * d.valueMult * d.pickMult * (gold ? GOLD_MULT : 1) * comboMult(combo);
  const { skills, ups } = addXp(s.skills, 'suchen', 1);
  let next = earn({ ...s, skills }, money);
  const prog = (s.jetonProgress || 0) + (!jetonsOn(s) ? 0 : combo >= COMBO_MAX ? 2 : 1);
  const gainedJ = Math.floor(prog / JETON_PER_COINS);
  next.jetonProgress = prog % JETON_PER_COINS;
  if (gainedJ) next = addJetons(next, gainedJ);
  next.stats = {
    ...next.stats, clicks: s.stats.clicks + 1, finds: s.stats.finds + 1, goldChips: s.stats.goldChips + (gold ? 1 : 0),
    maxCombo: Math.max(s.stats.maxCombo || 0, combo),
  };
  // Seltenes Album-Stück?
  let albumFind = null;
  if (rng() < ALBUM_CHANCE) {
    const set = ALBUM[LOCATIONS[s.location].id] || [];
    const [id, icon, name] = set[Math.floor(rng() * set.length)];
    const had = (next.album || {})[id] || 0;
    next = { ...next, album: { ...(next.album || {}), [id]: had + 1 } };
    const dupJ = had > 0 && jetonsOn(next) ? ALBUM_DUP_JETONS : 0;
    if (dupJ) next = addJetons(next, dupJ);
    albumFind = { id, icon, name, dup: had > 0, jetons: dupJ, setDone: had === 0 && set.every(([x]) => (next.album[x] || 0) > 0) };
  }
  return { state: next, result: { money, gold, jetons: gainedJ, album: albumFind, levelUp: ups > 0 ? skills.suchen.level : null } };
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
// Gewinn aus dem gemeinsamen (Server-)Jackpot gutschreiben
export const creditJackpot = (s, amount) => ({
  ...addJetons(s, JETON_JACKPOT), money: s.money + amount,
  stats: {
    ...s.stats, jackpots: (s.stats.jackpots || 0) + 1,
    gambleProfit: s.stats.gambleProfit + amount, gambleWon: (s.stats.gambleWon || 0) + amount,
    biggestWin: Math.max(s.stats.biggestWin, amount),
  },
});

// hitJackpot: vorher (außerhalb von React) ausgewürfelt, damit das Ergebnis eindeutig bleibt
export const recordBet = (s, didWin, amount, multiplier = 1, bet = 0, hitJackpot = false) => {
  const { skills } = addXp(s.skills, 'zocken', 1);
  if (didWin && multiplier >= 10) s = addJetons(s, 1);
  if (hitJackpot) s = addJetons(s, JETON_JACKPOT);
  const st = s.stats;
  const pool = jackpotPool(s) + Math.max(0, bet) * JACKPOT_SHARE;
  if (hitJackpot) {
    return {
      ...s, skills, money: s.money + pool, jackpot: 0,
      stats: {
        ...st, bets: st.bets + 1, betWins: st.betWins + 1, jackpots: (st.jackpots || 0) + 1,
        gambleProfit: st.gambleProfit + (didWin ? amount : -amount) + pool,
        gambleWon: (st.gambleWon || 0) + (didWin ? amount : 0) + pool,
        biggestWin: Math.max(st.biggestWin, pool),
      },
    };
  }
  return {
    ...s, skills, jackpot: pool,
    stats: {
      ...st, bets: st.bets + 1, betWins: st.betWins + (didWin ? 1 : 0),
      bigWins: (st.bigWins || 0) + (didWin && multiplier >= 10 ? 1 : 0),
      gambleProfit: st.gambleProfit + (didWin ? amount : -amount),
      gambleWon: (st.gambleWon || 0) + (didWin ? amount : 0),
      biggestWin: didWin && amount > st.biggestWin ? amount : st.biggestWin,
    },
  };
};

// ─── Jetons: zweite Währung fürs Casino ────────────────────────────────────
// Verdient wird nur durch eigenes Antippen (nie durch Helfer), große Gewinne, Jackpot und Glücksrad.
export const JETON_PER_COINS = 25;
export const JETON_COIN_CHANCE = 1 / 150;  // seltene Jeton-Münze auf dem Boden
export const JETON_COIN_VALUE = 5;
export const JETON_JACKPOT = 25;
export const LUCK_STEP = 0.005;            // Glückssträhne: +0,5 % Gewinnbonus je Stufe
export const FREE_SPINS_BASE = 8;
export const FREE_MULT_BASE = 2;
export const BONUS_PACK = 10;
export const INSURANCE_COOLDOWN_MS = 60 * 60 * 1000;
export const JETON_POT_SEED = 100;
export const HIGHROLLER_BETS = [1, 2, 5, 10, 20];

export function addJetons(s, n) {
  if (!jetonsOn(s)) return s;
  return { ...s, jetons: (s.jetons || 0) + n, stats: { ...s.stats, jetonsEarned: (s.stats.jetonsEarned || 0) + n } };
}
export const pickJeton = (s) => addJetons(s, JETON_COIN_VALUE);

export const JETON_ITEMS = [
  { id: 'freepack', icon: '🎁', name: 'Freispiel-Paket', desc: `${BONUS_PACK} Gratis-Spins am Automaten – mit Freispiel-Multiplikator`, use: true, cost: () => 25 },
  { id: 'wheelspin', icon: '🎡', name: 'Extra-Dreh', desc: 'Das Glücksrad ist sofort wieder drehbar', use: true, cost: () => 15,
    blocked: (s, now) => ((s.wheelReadyAt || 0) <= now ? 'Rad ist schon bereit' : null) },
  { id: 'luck', icon: '🍀', name: 'Glückssträhne', desc: '+0,5 % Gewinnbonus im Casino – pro Stufe', max: 10, cost: (l) => 30 * (l + 1) },
  { id: 'slotup', icon: '🎰', name: 'Automaten-Tuning', desc: 'Dieser Automat: +2 Freispiele und Freispiel-Gewinne +0,5×', max: 2, cost: (l) => [40, 120][l] || 0, perSlot: true },
  { id: 'turbo', icon: '⚡', name: 'Turbo-Walzen', desc: 'Alle Automaten drehen doppelt so schnell', max: 1, cost: () => 80 },
  { id: 'insurance', icon: '🛡️', name: 'Versicherung', desc: 'Einmal pro Stunde: Verlust ab halbem Max-Einsatz kommt zurück', max: 1, cost: () => 150 },
  { id: 'vipdisc', icon: '💳', name: 'VIP-Rabatt', desc: 'Alle VIP-Stufen 10 % günstiger', max: 1, cost: () => 200 },
  { id: 'highroller', icon: '💎', name: 'High-Roller-Lounge', desc: 'Exklusiver Automat: gespielt wird mit Jetons, eigener Jeton-Jackpot', max: 1, cost: () => 250 },
];
export const jetonItemLevel = (s, item) => {
  const js = s.jetonShop || {};
  if (item.perSlot) return (js.slotup || {})[LOCATIONS[s.location].id] || 0;
  return js[item.id] || 0;
};
export const buyJetonItem = (s, id, now = Date.now()) => {
  const item = JETON_ITEMS.find(x => x.id === id);
  if (!item) return null;
  const lvl = jetonItemLevel(s, item);
  if (item.max && lvl >= item.max) return null;
  if (item.blocked && item.blocked(s, now)) return null;
  const cost = item.cost(lvl);
  if ((s.jetons || 0) < cost) return null;
  const next = { ...s, jetons: s.jetons - cost, jetonShop: { ...(s.jetonShop || {}) } };
  if (id === 'freepack') next.bonusSpins = (s.bonusSpins || 0) + BONUS_PACK;
  else if (id === 'wheelspin') next.wheelReadyAt = 0;
  else if (item.perSlot) next.jetonShop.slotup = { ...(next.jetonShop.slotup || {}), [LOCATIONS[s.location].id]: lvl + 1 };
  else next.jetonShop[id] = lvl + 1;
  return next;
};
// High-Roller-Automat: Ergebnis buchen (die Jetons bewegt der Automat selbst)
export const recordJetonBet = (s, didWin, amount, multiplier, bet) => {
  const st = { ...s.stats, jetonsWon: (s.stats.jetonsWon || 0) + (didWin ? Math.max(0, amount) : 0), bets: s.stats.bets + 1 };
  if (multiplier >= 250) {
    const pot = s.jetonPot || JETON_POT_SEED;
    return { state: { ...s, jetons: (s.jetons || 0) + pot, jetonPot: JETON_POT_SEED, stats: { ...st, jetonsWon: st.jetonsWon + pot } }, pot };
  }
  return { state: { ...s, jetonPot: (s.jetonPot || JETON_POT_SEED) + bet * 0.1, stats: st }, pot: 0 };
};

// ─── Änderungen aus dem Admin-Menü ─────────────────────────────────────────
// Kommen über das Postfach des Servers und werden im laufenden Spiel angewendet.
export const applyAdminAction = (s, a) => {
  const st = { ...s.stats };
  const bumpEarned = (min) => { st.totalEarned = Math.max(st.totalEarned || 0, min); };
  switch (a.type) {
    case 'money': {
      const money = a.mode === 'set' ? Math.max(0, +a.amount || 0) : Math.max(0, s.money + (+a.amount || 0));
      if (money > s.money) st.totalEarned = (st.totalEarned || 0) + (money - s.money);
      return { ...s, money, stats: st };
    }
    case 'jetons': {
      const jetons = a.mode === 'set' ? Math.max(0, +a.amount || 0) : Math.max(0, (s.jetons || 0) + (+a.amount || 0));
      if (jetons > (s.jetons || 0)) st.jetonsEarned = (st.jetonsEarned || 0) + (jetons - (s.jetons || 0));
      return { ...s, jetons, stats: st };
    }
    case 'income': {
      const amount = earningsFor(s, Math.max(0, +a.seconds || 0));
      return earn(s, amount);
    }
    case 'location': {
      const loc = Math.max(0, Math.min(LOCATIONS.length - 1, Math.floor(+a.value || 0)));
      bumpEarned(LOCATIONS.slice(0, loc + 1).reduce((x, l) => x + l.cost, 0));
      return { ...s, location: loc, quest: Math.max(s.quest || 0, loc > 0 ? 7 : s.quest || 0), stats: st };
    }
    case 'vip': return { ...s, vip: Math.max(0, Math.min(60, Math.floor(+a.value || 0))) };
    case 'reset': return newGame();
    case 'replace': return { ...migrate(a.save), savedAt: Date.now() };
    default: return s;
  }
};
export const ADMIN_ACTION_TEXT = (a) => ({
  money: a.mode === 'set' ? `Dein Geld wurde auf ${fmtMoney(+a.amount)} gesetzt` : `+${fmtMoney(+a.amount)} vom Admin`,
  jetons: a.mode === 'set' ? `Deine Jetons wurden auf ${fmt(+a.amount, 0)} gesetzt` : `+${fmt(+a.amount, 0)} Jetons 🟣${a.note ? ` · ${a.note}` : ''}`,
  income: `Geschenk: ${Math.round((+a.seconds || 0) / 60)} Minuten Einkommen${a.note ? ` · ${a.note}` : ''}`,
  location: `Du wurdest nach ${(LOCATIONS[Math.floor(+a.value || 0)] || LOCATIONS[0]).name} versetzt`,
  vip: `Deine VIP-Stufe ist jetzt ${a.value}`,
  reset: 'Dein Spielstand wurde zurückgesetzt',
  replace: 'Dein Spielstand wurde vom Admin aktualisiert',
  message: a.text || '',
}[a.type] || '');

// Offline-Einnahmen seit dem letzten Speichern
export const offlineProgress = (s, now = Date.now()) => {
  const sec = Math.min(Math.max(0, (now - (s.savedAt || now)) / 1000), OFFLINE_CAP_SEC);
  const away = Math.max(0, (now - (s.savedAt || now)) / 1000);
  const earned = derive(s).incomePerSec * OFFLINE_RATE * sec;
  return { seconds: sec, away, earned, state: earn(s, earned) };
};

// ─── Zahlenformat ──────────────────────────────────────────────────────────
const SUFFIX = {
  de: ['', 'K', 'Mio', 'Mrd', 'Bio', 'Brd', 'Trio', 'Trd', 'Qua', 'Qui', 'Sxt', 'Spt'],
  short: ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'],
};
let numberFormat = 'de'; // 'de' = 1,25 Mio · 'short' = 1.25M (Einstellungen)
export const setNumberFormat = (f) => { numberFormat = SUFFIX[f] ? f : 'de'; };
export const fmt = (n, dec = 2) => {
  if (!isFinite(n)) return '∞';
  const de = numberFormat === 'de';
  const dot = (x) => (de ? x.replace('.', ',') : x);
  if (Math.abs(n) < 1000) return dot(n.toFixed(Math.abs(n) < 100 ? dec : 0));
  const list = SUFFIX[numberFormat];
  const i = Math.min(list.length - 1, Math.floor(Math.log10(Math.abs(n)) / 3));
  const v = n / Math.pow(1000, i);
  return dot(v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0)) + (de ? ' ' : '') + list[i];
};
export const fmtMoney = (n) => fmt(n) + ' €';
export const fmtTime = (sec) => {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = sec % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
};
