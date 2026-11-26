// ─── Skilltree: 5 Bereiche × 20 Knoten, bezahlt mit Jetons ────────────────
// Jeder Knoten verändert sichtbar, wie das Spiel funktioniert (keine reinen „+10 %“-Knoten).
// Mehrere Knoten mit demselben `key` sind Stufen derselben Mechanik.

export const TREE_BRANCHES = [
  { id: 'feld', name: 'Münzfeld', icon: '🪙', color: '#fbbf24', desc: 'Wie Münzen erscheinen und wie du sie einsammelst' },
  { id: 'combo', name: 'Combo', icon: '🔥', color: '#fb7185', desc: 'Serien, Fieber und Combo-Tricks' },
  { id: 'glueck', name: 'Glück', icon: '🍀', color: '#4ade80', desc: 'Casino, Glücksrad und zweite Chancen' },
  { id: 'helfer', name: 'Automatik', icon: '🤖', color: '#38bdf8', desc: 'Helfer im Feld, Geldsäcke und Offline' },
  { id: 'jeton', name: 'Schätze', icon: '🟣', color: '#c084fc', desc: 'Jetons, Album und Schatztruhen' },
];

// Kosten je Reihe (Reihe 7 = großer Abschlussknoten)
export const TREE_ROW_COST = [5, 10, 18, 30, 50, 80, 125, 400];

// [Reihe, Spalte, key, Icon, Name, Beschreibung]
const RAW = {
  feld: [
    [0, 1, 'reihe', '🚂', 'Münzreihe', 'Manchmal (4 %) erscheinen 5 Münzen auf einmal in einer Reihe.'],
    [1, 0, 'magnet', '🧲', 'Magnet', 'Tippst du eine Münze an, fliegt 1 Münze aus der Nähe gleich mit.'],
    [1, 2, 'kleber', '🍯', 'Sekundenkleber', 'Münzen bleiben 15 % länger liegen.'],
    [1, 1, 'split', '✨', 'Doppelgänger', 'Jede 25. angetippte Münze zerfällt in 2 neue Münzen.'],
    [2, 0, 'magnet', '🧲', 'Starker Magnet', 'Magnet zieht 2 Münzen aus größerem Umkreis.'],
    [2, 1, 'reihe', '🚂', 'Münzreihe II', 'Reihen kommen doppelt so oft (8 %).'],
    [2, 2, 'kleber', '🍯', 'Sekundenkleber II', 'Münzen bleiben 30 % länger liegen.'],
    [3, 0, 'wischen', '👋', 'Wischen', 'Halt den Finger gedrückt und wisch über die Münzen – alles wird eingesammelt.'],
    [3, 1, 'turm', '🗼', 'Münzturm', 'Manchmal (4 %) liegt ein Turm aus 3 Münzen: jeder Tipp holt eine, jede zählt doppelt.'],
    [3, 2, 'kleber', '🍯', 'Sekundenkleber III', 'Münzen bleiben 45 % länger liegen.'],
    [4, 0, 'magnet', '🧲', 'Elektromagnet', 'Magnet zieht 3 Münzen aus noch größerem Umkreis.'],
    [4, 1, 'reihe', '🌊', 'Münzwelle', 'Reihen werden zu Wellen aus 7 Münzen (12 %).'],
    [4, 2, 'turm', '🗼', 'Münzturm II', 'Türme kommen öfter (7 %).'],
    [5, 0, 'kette', '💥', 'Kettenreaktion', 'Goldmünzen explodieren und sammeln alle Münzen drumherum ein.'],
    [5, 1, 'reihe', '🌊', 'Münzwelle II', 'Wellen kommen noch öfter (16 %).'],
    [5, 2, 'turm', '🗼', 'Wolkenkratzer', 'Türme sind 5 Münzen hoch (10 %).'],
    [6, 0, 'kette', '💥', 'Große Explosion', 'Explosionen von Goldmünzen reichen viel weiter.'],
    [6, 1, 'reihe', '🌊', 'Tsunami', 'Jede fünfte Münze kommt als Welle (20 %).'],
    [6, 2, 'magnet', '🧲', 'Supermagnet', 'Magnet zieht 4 Münzen aus dem halben Feld.'],
    [7, 1, 'loch', '🕳️', 'Schwarzes Loch', 'Jede Minute erscheint ein Strudel. Tipp ihn an und er saugt ALLE Münzen vom Feld auf.'],
  ],
  combo: [
    [0, 1, 'schild', '🛡️', 'Combo-Schild', 'Ein Fehlklick ins Leere bricht deine Combo nicht.'],
    [1, 0, 'atem', '⏱️', 'Langer Atem', 'Du hast 20 % mehr Zeit bis zur nächsten Münze.'],
    [1, 2, 'serie', '⭐', 'Goldene Serie', 'Jede 10. Münze einer Combo zählt dreifach.'],
    [1, 1, 'funke', '🎇', 'Funkenflug', 'Bei jeder vollen 10er-Combo fällt eine Goldmünze vom Himmel.'],
    [2, 0, 'atem', '⏱️', 'Langer Atem II', '40 % mehr Zeit für die Combo.'],
    [2, 1, 'schild', '🛡️', 'Doppelschild', 'Zwei Fehlklicks pro Combo werden verziehen.'],
    [2, 2, 'serie', '⭐', 'Goldene Serie II', 'Schon jede 8. Münze zählt dreifach.'],
    [3, 0, 'echo', '🔁', 'Combo-Echo', 'Reißt die Combo, behältst du ein Viertel davon.'],
    [3, 1, 'fieber', '🌡️', 'Fieber', 'Ab Combo 40: 6 Sekunden Fieber – alle Münzen zählen doppelt und kommen doppelt so schnell.'],
    [3, 2, 'kasse', '🟣', 'Combo-Kasse', 'Alle 50 Combo gibt es 1 Jeton.'],
    [4, 0, 'echo', '🔁', 'Combo-Echo II', 'Reißt die Combo, behältst du die Hälfte.'],
    [4, 1, 'fieber', '🌡️', 'Hohes Fieber', 'Fieber schon ab Combo 30, dauert 8 Sekunden.'],
    [4, 2, 'serie', '⭐', 'Goldene Serie III', 'Jede 6. Münze zählt dreifach.'],
    [5, 0, 'atem', '⏱️', 'Langer Atem III', '60 % mehr Zeit für die Combo.'],
    [5, 1, 'fieber', '🌡️', 'Fieberwahn', 'Fieber ab Combo 25, dauert 10 Sekunden.'],
    [5, 2, 'kasse', '🟣', 'Combo-Kasse II', 'Alle 25 Combo gibt es 1 Jeton.'],
    [6, 0, 'schild', '🛡️', 'Dreifachschild', 'Drei Fehlklicks pro Combo werden verziehen.'],
    [6, 1, 'fieber', '🌡️', 'Hitzewelle', 'Fieber ab Combo 20, dauert 12 Sekunden.'],
    [6, 2, 'serie', '⭐', 'Goldene Serie IV', 'Jede 5. Münze zählt dreifach.'],
    [7, 1, 'inferno', '☄️', 'Inferno', 'Im Fieber sammelt jeder Tipp ALLE Münzen auf dem Feld ein.'],
  ],
  glueck: [
    [0, 1, 'chance', '🪙', 'Zweite Chance', '3 % deiner verlorenen Einsätze kommen zurück.'],
    [1, 0, 'trink', '🤵', 'Trinkgeld', 'Bei jeder Casino-Runde 2 % Chance auf einen Jeton vom Croupier.'],
    [1, 2, 'pech', '📉', 'Pech-Konto', 'Nach 3 Niederlagen in Folge bringt der nächste Gewinn +50 %.'],
    [1, 1, 'klee', '☘️', 'Kleeblatt-Münze', 'Selten liegt ein Kleeblatt im Feld: antippen = 3 Gratis-Spins am Automaten.'],
    [2, 0, 'trink', '🤵', 'Trinkgeld II', '4 % Chance auf einen Jeton pro Runde.'],
    [2, 1, 'chance', '🪙', 'Zweite Chance II', '6 % der verlorenen Einsätze kommen zurück.'],
    [2, 2, 'pech', '📉', 'Pech-Konto II', 'Nach einer Pechsträhne: nächster Gewinn +100 %.'],
    [3, 0, 'rad', '🎡', 'Schnelles Rad', 'Das Glücksrad ist 1 Minute früher wieder bereit.'],
    [3, 1, 'doppel', '🎯', 'Doppel-Dreh', '15 % Chance, dass das Glücksrad gleich zweimal dreht.'],
    [3, 2, 'big', '💎', 'Big-Win-Bonus', 'Gewinne ab ×10 bringen 2 Jetons extra.'],
    [4, 0, 'rad', '🎡', 'Schnelles Rad II', 'Glücksrad 2 Minuten früher bereit.'],
    [4, 1, 'chance', '🪙', 'Zweite Chance III', '9 % der verlorenen Einsätze kommen zurück.'],
    [4, 2, 'pech', '📉', 'Pech-Konto III', 'Nach einer Pechsträhne: nächster Gewinn +150 %.'],
    [5, 0, 'trink', '🤵', 'Trinkgeld III', '6 % Chance auf einen Jeton pro Runde.'],
    [5, 1, 'doppel', '🎯', 'Doppel-Dreh II', '30 % Chance auf einen zweiten Dreh.'],
    [5, 2, 'big', '💎', 'Big-Win-Bonus II', 'Gewinne ab ×10 bringen 4 Jetons extra.'],
    [6, 0, 'rad', '🎡', 'Schnelles Rad III', 'Glücksrad 3 Minuten früher bereit.'],
    [6, 1, 'chance', '🪙', 'Zweite Chance IV', '12 % der verlorenen Einsätze kommen zurück.'],
    [6, 2, 'freispiel', '🎁', 'Stammgast', 'Alle 50 Casino-Runden schenkt dir das Haus 5 Gratis-Spins.'],
    [7, 1, 'goldstunde', '🌟', 'Goldene Minute', 'Alle 20 Minuten: eine Minute lang zählen alle Casino-Gewinne doppelt.'],
  ],
  helfer: [
    [0, 1, 'figuren', '🧹', 'Helfer im Feld', 'Einer deiner Helfer läuft übers Feld und schnappt sich alle 8 s eine Münze.'],
    [1, 0, 'tresor', '🏦', 'Offline-Tresor', 'Offline verdienen Helfer 30 % statt 20 %.'],
    [1, 2, 'sack', '💰', 'Geldsack-Kurier', 'Geldsäcke kommen 20 % öfter.'],
    [1, 1, 'frueh', '🌅', 'Frühschicht', 'Die ersten 2 Minuten nach dem Spielstart arbeiten deine Helfer dreifach.'],
    [2, 0, 'tresor', '🏦', 'Offline-Tresor II', 'Offline verdienen Helfer 40 %.'],
    [2, 1, 'figuren', '🧹', 'Fleißiger Helfer', 'Der Helfer im Feld schnappt alle 6 s zu.'],
    [2, 2, 'sack', '💰', 'Geldsack-Kurier II', 'Geldsäcke kommen 40 % öfter.'],
    [3, 0, 'schicht', '⏰', 'Schichtwechsel', 'Alle 5 Minuten arbeiten deine Helfer 30 Sekunden doppelt.'],
    [3, 1, 'nase', '👃', 'Spürnase', 'Der Helfer im Feld holt sich zuerst Goldmünzen und Jetons.'],
    [3, 2, 'sackplus', '🎒', 'Prall gefüllt', 'Geldsäcke bringen Geld UND Geldregen zugleich.'],
    [4, 0, 'tresor', '🏦', 'Offline-Tresor III', 'Offline verdienen Helfer 50 %.'],
    [4, 1, 'figuren', '🧹', 'Flinker Helfer', 'Der Helfer im Feld schnappt alle 4 s zu.'],
    [4, 2, 'sack', '💰', 'Geldsack-Kurier III', 'Geldsäcke kommen 80 % öfter.'],
    [5, 0, 'schicht', '⏰', 'Doppelschicht', 'Die doppelte Schicht dauert 45 Sekunden.'],
    [5, 1, 'lehrling', '🎓', 'Lehrlinge', 'Was der Helfer im Feld aufhebt, füllt auch deine Jeton-Leiste.'],
    [5, 2, 'regen', '🌧️', 'Langer Regen', 'Geldregen dauert 30 statt 20 Sekunden.'],
    [6, 0, 'schicht', '⏰', 'Dauerschicht', 'Die doppelte Schicht dauert 60 Sekunden.'],
    [6, 1, 'figuren', '🧹', 'Turbo-Helfer', 'Der Helfer im Feld schnappt alle 3 s zu.'],
    [6, 2, 'regen', '🌧️', 'Monsun', 'Geldregen dauert 40 Sekunden.'],
    [7, 1, 'armee', '🤖', 'Roboter-Armee', 'Drei Helfer laufen gleichzeitig übers Feld.'],
  ],
  jeton: [
    [0, 1, 'jmag', '🟣', 'Jeton-Magnet', 'Jeton-Münzen tauchen 25 % öfter auf.'],
    [1, 0, 'lupe', '🔍', 'Album-Lupe', 'Album-Karten findest du 50 % öfter.'],
    [1, 2, 'doppelj', '✌️', 'Doppel-Jeton', 'Wenn die Jeton-Leiste voll ist: 20 % Chance auf 2 statt 1.'],
    [1, 1, 'jregen', '🌧️', 'Jeton-Regen', 'Im Geldregen fallen 2,5× so viele Jeton-Münzen.'],
    [2, 0, 'lupe', '🔍', 'Album-Lupe II', 'Album-Karten doppelt so oft.'],
    [2, 1, 'jmag', '🟣', 'Jeton-Magnet II', 'Jeton-Münzen 50 % öfter.'],
    [2, 2, 'doppelj', '✌️', 'Doppel-Jeton II', '40 % Chance auf 2 Jetons.'],
    [3, 0, 'kompass', '🧭', 'Album-Kompass', 'Du findest immer zuerst Karten, die dir noch fehlen.'],
    [3, 1, 'truhe', '🧰', 'Schatztruhe', 'Selten liegt eine Truhe im Feld: 5× antippen = 10–30 Jetons.'],
    [3, 2, 'rabatt', '🏷️', 'Stammkunde', 'Alles im Jeton-Shop 10 % günstiger.'],
    [4, 0, 'charm', '🍀', 'Glücksbringer-Gespür', 'Glücksbringer tauchen 30 % öfter auf.'],
    [4, 1, 'truhe', '🧰', 'Schatzsucher', 'Truhen tauchen öfter auf.'],
    [4, 2, 'rabatt', '🏷️', 'Ehrengast', 'Jeton-Shop 20 % günstiger.'],
    [5, 0, 'charm', '🍀', 'Glücksbringer-Gespür II', 'Glücksbringer 60 % öfter.'],
    [5, 1, 'jmag', '🟣', 'Jeton-Magnet III', 'Jeton-Münzen 75 % öfter.'],
    [5, 2, 'doppelj', '✌️', 'Doppel-Jeton III', '60 % Chance auf 2 Jetons.'],
    [6, 0, 'lupe', '🔍', 'Album-Lupe III', 'Album-Karten dreimal so oft.'],
    [6, 1, 'truhe', '🧰', 'Schatzjäger', 'Truhen tauchen noch öfter auf.'],
    [6, 2, 'leiste', '📏', 'Kurze Leiste', 'Die Jeton-Leiste ist schon nach 20 statt 25 Münzen voll.'],
    [7, 1, 'midas', '👑', 'Midas', 'Alle 10 Minuten: 8 Sekunden lang wird jede neue Münze zu Gold.'],
  ],
};

export const TREE = [];
Object.entries(RAW).forEach(([b, list]) => {
  list.forEach(([r, c, key, icon, name, desc]) => {
    TREE.push({ id: `${b}-${r}-${c}`, b, r, c, key, icon, name, desc, cost: TREE_ROW_COST[r] });
  });
});
// Jeder Knoten hängt am Knoten darüber (gleiche Spalte), sonst an der Mitte der Reihe darüber.
TREE.forEach(n => {
  if (n.r === 0) { n.req = null; return; }
  const same = TREE.find(m => m.b === n.b && m.r === n.r - 1 && m.c === n.c);
  const mid = TREE.find(m => m.b === n.b && m.r === n.r - 1 && m.c === 1);
  n.req = (same || mid).id;
});
// Abschlussknoten brauchen alle drei Knoten der Reihe darüber
TREE.filter(n => n.r === 7).forEach(n => { n.reqAll = TREE.filter(m => m.b === n.b && m.r === 6).map(m => m.id); });

export const treeNode = (id) => TREE.find(n => n.id === id);
const owned = (s) => (s && s.tree) || {};
export const treeOwned = (s, id) => !!owned(s)[id];
export const treeCount = (s) => TREE.filter(n => treeOwned(s, n.id)).length;
export const treeCanReach = (s, n) => (n.reqAll ? n.reqAll.every(id => treeOwned(s, id)) : !n.req || treeOwned(s, n.req));

// Wie viele Stufen einer Mechanik besitzt man?
const lvl = (s, key) => TREE.reduce((a, n) => (n.key === key && treeOwned(s, n.id) ? a + 1 : a), 0);

// Alle Effekte auf einen Blick (für Spiel-Logik und Anzeige)
const fxCache = new WeakMap();
const EMPTY_TREE = {};
export const treeFx = (s) => {
  const key = (s && s.tree) || EMPTY_TREE;
  const hit = fxCache.get(key);
  if (hit) return hit;
  const out = treeFxCalc(s);
  fxCache.set(key, out);
  return out;
};
const treeFxCalc = (s) => {
  const L = (k) => lvl(s, k);
  const reihe = L('reihe');
  const turm = L('turm');
  const fieber = L('fieber');
  return {
    rowChance: [0, 0.04, 0.08, 0.12, 0.16, 0.20][reihe],
    rowLen: reihe >= 3 ? 7 : 5,
    magnet: [0, 1, 2, 3, 4][L('magnet')],
    magnetRadius: [0, 14, 18, 23, 32][L('magnet')],
    lifeMult: 1 + 0.15 * L('kleber'),
    swipe: L('wischen') > 0,
    towerChance: [0, 0.04, 0.07, 0.10][turm],
    towerSize: turm >= 3 ? 5 : 3,
    blast: [0, 20, 32][L('kette')],
    blackHole: L('loch') > 0,
    shield: L('schild'),
    comboWindow: 1 + 0.2 * L('atem'),
    streakEvery: [0, 10, 8, 6, 5][L('serie')],
    echo: [0, 0.25, 0.5][L('echo')],
    feverAt: [0, 40, 30, 25, 20][fieber],
    feverSec: [0, 6, 8, 10, 12][fieber],
    comboJetonEvery: [0, 50, 25][L('kasse')],
    inferno: L('inferno') > 0,
    refund: [0, 0.03, 0.06, 0.09, 0.12][L('chance')],
    tip: [0, 0.02, 0.04, 0.06][L('trink')],
    badLuck: [0, 0.5, 1, 1.5][L('pech')],
    wheelFaster: L('rad'),
    wheelTwice: [0, 0.15, 0.30][L('doppel')],
    bigWinJetons: [0, 2, 4][L('big')],
    houseGift: L('freispiel') > 0,
    goldMinute: L('goldstunde') > 0,
    walkers: L('figuren') === 0 ? 0 : L('armee') ? 3 : 1,
    walkEvery: [0, 8, 6, 4, 3][L('figuren')],
    offlineRate: [0.2, 0.3, 0.4, 0.5][L('tresor')],
    sackMult: [1, 1.2, 1.4, 1.8][L('sack')],
    shiftSec: [0, 30, 45, 60][L('schicht')],
    nose: L('nase') > 0,
    sackPlus: L('sackplus') > 0,
    apprentice: L('lehrling') > 0,
    frenzySec: [20, 30, 40][L('regen')],
    jetonCoinMult: [1, 1.25, 1.5, 1.75][L('jmag')],
    albumMult: [1, 1.5, 2, 3][L('lupe')],
    doubleJeton: [0, 0.2, 0.4, 0.6][L('doppelj')],
    compass: L('kompass') > 0,
    chestChance: [0, 1 / 500, 1 / 350, 1 / 250][L('truhe')],
    shopDiscount: [1, 0.9, 0.8][L('rabatt')],
    charmMult: [1, 1.3, 1.6][L('charm')],
    jetonBar: L('leiste') ? 20 : 25,
    midas: L('midas') > 0,
    splitEvery: L('split') ? 25 : 0,
    sparkEvery: L('funke') ? 10 : 0,
    cloverChance: L('klee') ? 1 / 300 : 0,
    earlyShift: L('frueh') > 0,
    jetonRain: L('jregen') > 0,
  };
};

// Zeitgesteuerte Ereignisse aus dem Baum (Schichtwechsel, Goldene Minute, Midas)
// laufen nach der Uhr – so braucht es keinen gespeicherten Timer.
export const SHIFT_EVERY_SEC = 300;
export const GOLD_MINUTE_EVERY_SEC = 1200;
export const MIDAS_EVERY_SEC = 600;
export const MIDAS_SEC = 8;
const phase = (now, every) => (now / 1000) % every;
export const shiftActive = (fx, now = Date.now()) => fx.shiftSec > 0 && phase(now, SHIFT_EVERY_SEC) < fx.shiftSec;
export const goldMinuteActive = (fx, now = Date.now()) => fx.goldMinute && phase(now + 600000, GOLD_MINUTE_EVERY_SEC) < 60;
// Frühschicht: die ersten 2 Minuten nach dem Laden des Spiels
const SESSION_START = Date.now();
export const EARLY_SEC = 120;
export const earlyActive = (fx, now = Date.now()) => fx.earlyShift && now - SESSION_START < EARLY_SEC * 1000;
export const midasActive = (fx, now = Date.now()) => fx.midas && phase(now + 300000, MIDAS_EVERY_SEC) < MIDAS_SEC;
export const secondsUntil = (every, offsetMs, now = Date.now()) => Math.ceil(every - phase(now + offsetMs, every));

// Knoten kaufen
export const buyTreeNode = (s, id) => {
  const n = treeNode(id);
  if (!n || treeOwned(s, id) || !treeCanReach(s, n)) return null;
  if ((s.jetons || 0) < n.cost) return null;
  return { ...s, jetons: s.jetons - n.cost, tree: { ...owned(s), [id]: true }, stats: { ...s.stats, treeSpent: (s.stats.treeSpent || 0) + n.cost } };
};
