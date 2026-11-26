import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  LOCATIONS, SKILLS, xpForLevel, fmt, fmtMoney, rollSpawn, randomJunk, comboMult,
  MAX_ON_FLOOR, COIN_LIFETIME, GOLD_LIFETIME, CHARM_LIFETIME, COMBO_WINDOW_MS, COMBO_MAX, COMBO_MILESTONES,
  SACK_MIN_SEC, SACK_MAX_SEC, JETON_COIN_VALUE,
} from './economy';
import { midasActive } from './tree';
import { sfx } from './sound';
import { fx, catchAt } from './fx';

const DECO = {
  hinterhof: ['🥫', '🚬', '📰', '🗑️', '🍌', '🧦'],
  kneipe: ['🍺', '🥜', '🎯', '🍻', '🧂'],
  spielhalle: ['🕹️', '🍿', '🎟️', '👾', '🥤'],
  casino: ['🍸', '🫒', '🎩', '💍', '🃏'],
  vegas: ['🌴', '🕶️', '🎰', '💃', '🪩'],
  monaco: ['🍾', '⚓', '🛥️', '⌚', '🦞'],
  mond: ['🌑', '🛰️', '⭐', '🪐', '👨‍🚀'],
  mars: ['🪨', '🏜️', '🤖', '🌋', '🛸'],
  station: ['🔩', '📡', '🧪', '🌍', '🛰️'],
  blackhole: ['🌀', '☄️', '✴️', '⏳', '🌑'],
  multiverse: ['🪞', '⚛️', '🌈', '🧬', '💠'],
};

let uid = 0;

// Zufällige Stelle, die nicht direkt auf einer anderen Münze liegt
const freeSpot = (list) => {
  let best = null;
  for (let i = 0; i < 8; i++) {
    const p = { x: 8 + Math.random() * 84, y: 16 + Math.random() * 72 };
    const clash = list.some(o => Math.abs(o.x - p.x) < 9 && Math.abs(o.y - p.y) < 14);
    if (!clash) return p;
    best = p;
  }
  return best;
};
export const coinLabel = (c) => `${c.label} ${c.unit}`;

// Eine Münze bzw. ein Chip auf dem Boden (auch Turm, Truhe, Kleeblatt)
function Coin({ item, onPick }) {
  const { coin, gold, charm, life } = item;
  if (!coin && !charm && !item.jeton && !item.chest && !item.clover) return null;
  const style = {
    left: `${item.x}%`, top: `${item.y}%`,
    '--size': `${charm || !coin ? 46 : coin.size}px`, '--rot': `${item.rot}deg`, '--glint': `${item.glint}s`, '--delay': `${item.delay || 0}s`,
    animationDuration: `${life}s`,
  };
  const pick = (e) => { e.stopPropagation(); onPick(item, e); };
  if (item.chest) {
    return (
      <button className={`mg-coin chest${item.hp < 5 ? ' hit' : ''}`} style={{ ...style, '--size': '54px' }} onPointerDown={pick} aria-label="Schatztruhe öffnen">
        <span className="shadow" /><span className="ic">🧰</span><span className="hp">{'●'.repeat(item.hp)}</span>
      </button>
    );
  }
  if (item.clover) {
    return (
      <button className="mg-coin clover" style={{ ...style, '--size': '48px' }} onPointerDown={pick} aria-label="Kleeblatt aufheben">
        <span className="shadow" /><span className="body"><span className="face"><b>☘️</b></span></span>
      </button>
    );
  }
  if (item.jeton) {
    return (
      <button className="mg-coin jeton" style={{ ...style, '--size': '50px' }} onPointerDown={pick} aria-label="Jeton aufheben">
        <span className="shadow" /><span className="body"><span className="face"><b>J</b><i>+{JETON_COIN_VALUE}</i></span></span>
      </button>
    );
  }
  if (charm) {
    return (
      <button className="mg-coin charm" style={style} onPointerDown={pick} aria-label={`${charm.name} aufheben`}>
        <span className="ic">{charm.icon}</span>
      </button>
    );
  }
  const tower = item.tower || 0;
  return (
    <button className={`mg-coin ${coin.kind}${gold ? ' gold' : ''}${tower > 1 ? ' tower' : ''}`} style={{ ...style, '--stack': Math.max(0, tower - 1) }} onPointerDown={pick} aria-label={`${coinLabel(coin)} aufheben`}>
      <span className="shadow" /><span className="body"><span className="face"><b>{coin.label}</b><i>{coin.unit}</i></span></span>
      {tower > 1 && <span className="tower-n">×{tower}</span>}
    </button>
  );
}

function GoalBanner({ state, onMove, hl }) {
  const next = LOCATIONS[state.location + 1];
  if (!next) {
    return (
      <div className="mg-panel mg-goal">
        <div className="icon">👑</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800 }}>Du bist ganz oben angekommen!</div>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Jag jetzt die Mogul-Krone und sammle alle Glücksbringer.</div>
        </div>
      </div>
    );
  }
  const pct = Math.min(1, state.money / next.cost);
  const ready = pct >= 1;
  return (
    <div data-tut="goal" className={`mg-panel mg-goal${hl ? ' mg-hl' : ''}`}>
      <div className="icon">{next.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
          <span><span style={{ color: 'var(--muted)' }}>Nächstes Ziel:</span> <b>{next.name}</b></span>
          <span style={{ color: ready ? 'var(--green)' : 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{fmt(state.money)} / {fmtMoney(next.cost)}</span>
        </div>
        <div className="bar"><div className={`fill ${ready ? 'ready' : ''}`} style={{ width: `${pct * 100}%` }} /></div>
      </div>
      {ready && <button className="mg-btn-go" onClick={onMove}>Umziehen →</button>}
    </div>
  );
}

function Skill({ id, skill }) {
  const def = SKILLS[id];
  const need = xpForLevel(id, skill.level);
  return (
    <div className="mg-skill">
      <div className="ic">{def.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{def.name} <span className="mg-lvl">Lv {skill.level}</span></span>
          <span style={{ color: 'var(--dim)', fontSize: 11 }}>{fmt(skill.xp, 0)} / {fmt(need, 0)} XP</span>
        </div>
        <div className="bar"><div className="fill" style={{ width: `${(skill.xp / need) * 100}%` }} /></div>
        <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4 }}>{def.desc(skill.level)}</div>
      </div>
    </div>
  );
}

export default function SearchView({ state, derived, onPickup, onPickCharm, onOpenSack, onMove, onCharm, hl = '', showGoal = true, showExtras = true, allowSack = true, onPickJeton, showJetons = false, onAlbum, fingerEvery = 0, onMiss, onSecret, onChest, onClover, helperIcon = '🧹', fieldHelpers = true }) {
  const [items, setItems] = useState([]);
  const [floats, setFloats] = useState([]);
  const floorRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const rateRef = useRef(derived.spawnRate);
  rateRef.current = derived.spawnRate;
  const frenzyRef = useRef(derived.frenzy);
  frenzyRef.current = derived.frenzy;
  const tf = derived.tree; // Skilltree-Effekte
  const tfRef = useRef(tf);
  tfRef.current = tf;
  const comboRef = useRef({ n: 0, last: 0, shield: 0 });
  const pickEVRef = useRef(derived.pickEV);
  pickEVRef.current = derived.pickEV;
  const allowSackRef = useRef(allowSack);
  allowSackRef.current = allowSack;
  const [combo, setCombo] = useState(0);
  const [sack, setSack] = useState(null);
  const [hole, setHole] = useState(null);
  const [shake, setShake] = useState(false);
  const [feverUntil, setFeverUntil] = useState(0);
  const feverRef = useRef(0);
  feverRef.current = feverUntil;
  const [, setTick] = useState(0);
  const loc = LOCATIONS[state.location];
  const comboWindow = COMBO_WINDOW_MS * tf.comboWindow;
  const comboWindowRef = useRef(comboWindow);
  comboWindowRef.current = comboWindow;
  const feverOn = feverUntil > Date.now();
  const midasOn = midasActive(tf);

  // Sekundentakt für Anzeigen (Fieber, Midas, Schicht)
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);

  const deco = useMemo(() => {
    const list = DECO[loc.id] || [];
    return Array.from({ length: 8 }, (_, i) => ({
      e: list[i % list.length], x: 5 + ((i * 37) % 88), y: 8 + ((i * 53) % 80), r: (i * 47) % 360,
    }));
  }, [loc.id]);

  // Beim Ortswechsel den Boden leeren
  useEffect(() => { setItems([]); }, [loc.id]);

  // Neue Münze(n) aus einem Wurf bauen – auch Reihen und Türme aus dem Skilltree
  const makeSpawn = (list, now) => {
    const t = tfRef.current;
    const sp = rollSpawn(stateRef.current, Math.random, frenzyRef.current);
    const life = (sp.type === 'charm' || sp.type === 'jeton' || sp.type === 'clover' ? CHARM_LIFETIME : sp.type === 'chest' ? CHARM_LIFETIME * 2 : sp.gold ? GOLD_LIFETIME : COIN_LIFETIME) * t.lifeMult;
    const base = { born: now, rot: Math.random() * 60 - 30, glint: 1.2 + Math.random() * 4, life };
    if (sp.type === 'coin' && !sp.gold && t.rowChance && Math.random() < t.rowChance) {
      // Münzreihe / Münzwelle
      const n = t.rowLen;
      const gap = n > 5 ? 11.5 : 14;
      const x0 = 8 + Math.random() * Math.max(0, 84 - gap * (n - 1));
      const y = 18 + Math.random() * 66;
      const wave = n > 5;
      return Array.from({ length: n }, (_, i) => ({
        ...base, id: ++uid, x: x0 + i * gap, y: wave ? y + Math.sin(i * 0.9) * 7 : y, delay: i * 0.07, rot: 0,
        coin: sp.coin, gold: false, charm: null, jeton: false,
      }));
    }
    const { x, y } = freeSpot(list);
    const gold = sp.type === 'coin' && (sp.gold || midasActive(t));
    return [{
      ...base, id: ++uid, x, y,
      coin: sp.coin, gold, charm: sp.type === 'charm' ? sp.charm : null, jeton: sp.type === 'jeton',
      chest: sp.type === 'chest', hp: sp.type === 'chest' ? 5 : 0, clover: sp.type === 'clover',
      tower: sp.type === 'coin' && !gold && t.towerChance && Math.random() < t.towerChance ? t.towerSize : 0,
      life: gold ? GOLD_LIFETIME * t.lifeMult * (midasActive(t) ? 1.6 : 1) : life,
    }];
  };
  const makeSpawnRef = useRef(makeSpawn);
  makeSpawnRef.current = makeSpawn;

  // Eine Münze an eine bestimmte Stelle setzen (Doppelgänger, Funkenflug)
  const dropCoin = useCallback((x, y, gold = false) => {
    const sp = rollSpawn({ ...stateRef.current, charms: Object.fromEntries(Object.keys(stateRef.current.charms || {}).map(k => [k, 999])) }, Math.random, false);
    if (!sp.coin) return;
    setItems(cur => [...cur, {
      id: ++uid, x: Math.max(6, Math.min(94, x)), y: Math.max(14, Math.min(90, y)), born: performance.now(), rot: Math.random() * 60 - 30, glint: 2,
      coin: sp.coin, gold, charm: null, jeton: false, life: (gold ? GOLD_LIFETIME : COIN_LIFETIME) * tfRef.current.lifeMult,
    }]);
  }, []);

  // Münzen erscheinen lassen und verschwinden lassen
  useEffect(() => {
    let acc = 0.6; // erste Münze kommt schnell
    let last = performance.now();
    let nextSack = performance.now() + 40000; // erster Geldsack nach 40 s
    let nextHole = performance.now() + 30000;
    const id = setInterval(() => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 1);
      last = now;
      if (document.visibilityState === 'hidden') return;
      const fever = feverRef.current > Date.now();
      acc += rateRef.current * dt * (fever ? 2 : 1);
      if (now >= nextSack && allowSackRef.current) {
        nextSack = now + ((SACK_MIN_SEC + Math.random() * (SACK_MAX_SEC - SACK_MIN_SEC)) * 1000) / tfRef.current.sackMult;
        setSack({ id: ++uid, born: now });
      }
      setSack(cur => (cur && now - cur.born > 9000 ? null : cur));
      // Schwarzes Loch (Skilltree): jede Minute ein Strudel
      if (tfRef.current.blackHole && now >= nextHole) {
        nextHole = now + 60000;
        setHole({ id: ++uid, born: now, x: 15 + Math.random() * 70, y: 25 + Math.random() * 55 });
      }
      setHole(cur => (cur && now - cur.born > 9000 ? null : cur));
      // Combo verfällt (Combo-Echo: ein Teil bleibt)
      const c = comboRef.current;
      if (c.n > 0 && Date.now() - c.last > comboWindowRef.current) {
        const keep = Math.floor(c.n * tfRef.current.echo);
        c.n = keep; c.shield = 0;
        if (keep > 0) c.last = Date.now();
        setCombo(keep);
      }
      const maxFloor = (frenzyRef.current || fever ? MAX_ON_FLOOR * 2 : MAX_ON_FLOOR);
      setItems(cur => {
        let list = cur.filter(it => now - it.born < it.life * 1000);
        while (acc >= 1) {
          acc -= 1;
          if (list.length >= maxFloor) continue;
          list = [...list, ...makeSpawnRef.current(list, now)];
        }
        return list.length === cur.length && list.every((o, i) => o === cur[i]) ? cur : list;
      });
    }, 100);
    return () => clearInterval(id);
  }, []);

  // Geheimer Erfolg „Zen-Meister“: 60 s aufs Münzfeld schauen, ohne zu tippen
  const lastTapRef = useRef(Date.now());
  const secretRef = useRef(onSecret);
  secretRef.current = onSecret;
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'hidden') { lastTapRef.current = Date.now(); return; }
      if (Date.now() - lastTapRef.current > 60000 && secretRef.current) { secretRef.current('zen'); lastTapRef.current = Date.now() + 1e12; }
    }, 2000);
    return () => clearInterval(id);
  }, []);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  // Landung: Staubwölkchen (und Lichtring bei Gold), wenn eine neue Münze aufschlägt
  const seenRef = useRef(new Set());
  useEffect(() => {
    const seen = seenRef.current;
    const fresh = items.filter(it => !seen.has(it.id));
    if (!fresh.length) { if (seen.size > 400) seenRef.current = new Set(items.map(i => i.id)); return; }
    fresh.forEach(it => {
      seen.add(it.id);
      if (it.charm) return;
      setTimeout(() => {
        const rect = floorRef.current && floorRef.current.getBoundingClientRect();
        if (!rect || !itemsRef.current.some(o => o.id === it.id)) return;
        const cx = rect.left + (it.x / 100) * rect.width;
        const cy = rect.top + (it.y / 100) * rect.height;
        fx.dust(cx, cy + 10);
        if (it.gold) fx.ring(cx, cy, { color: '#fde047', r: 70, width: 4, life: 0.5 });
      }, 290 + (it.delay || 0) * 1000);
    });
  }, [items]);
  const pickAtRef = useRef(null);
  // Goldener Finger: tippt automatisch alle paar Sekunden einen zufälligen Chip an
  const [finger, setFinger] = useState({ x: 50, y: 55, tap: 0 });
  useEffect(() => {
    if (!fingerEvery) return undefined;
    let t1; let t2;
    const loop = () => {
      t1 = setTimeout(() => {
        const list = itemsRef.current.filter(it => !it.charm && !it.chest && (it.coin || it.jeton));
        if (list.length && document.visibilityState !== 'hidden') {
          const target = list[Math.floor(Math.random() * list.length)];
          setFinger(f => ({ ...f, x: target.x, y: target.y }));
          t2 = setTimeout(() => {
            const still = itemsRef.current.find(it => it.id === target.id);
            const rect = floorRef.current && floorRef.current.getBoundingClientRect();
            if (still && rect && pickAtRef.current) {
              setFinger(f => ({ ...f, tap: f.tap + 1 }));
              pickAtRef.current(still, (still.x / 100) * rect.width, (still.y / 100) * rect.height, 'auto');
            }
          }, 480);
        }
        loop();
      }, fingerEvery * 1000);
    };
    loop();
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [fingerEvery]);

  // Helfer im Feld (Skilltree): laufen herum und schnappen sich Münzen
  const walkers = fieldHelpers ? tf.walkers : 0; // Einstellung: Helfer im Feld aus
  const walkEvery = tf.walkEvery;
  const [walkPos, setWalkPos] = useState([]);
  useEffect(() => {
    if (!walkers || !walkEvery) { setWalkPos([]); return undefined; }
    setWalkPos(Array.from({ length: walkers }, (_, i) => ({ x: 20 + i * 30, y: 80, tap: 0, flip: false })));
    const timers = [];
    for (let w = 0; w < walkers; w++) {
      const loop = () => {
        timers[w * 2] = setTimeout(() => {
          const nose = tfRef.current.nose;
          const all = itemsRef.current.filter(it => !it.charm && !it.chest && !it.clover && (it.coin || it.jeton));
          const best = nose ? all.filter(it => it.gold || it.jeton) : [];
          const list = best.length ? best : all;
          if (list.length && document.visibilityState !== 'hidden') {
            const target = list[Math.floor(Math.random() * list.length)];
            setWalkPos(ps => ps.map((p, i) => (i === w ? { ...p, x: target.x, y: target.y, flip: target.x < p.x } : p)));
            timers[w * 2 + 1] = setTimeout(() => {
              const still = itemsRef.current.find(it => it.id === target.id);
              const rect = floorRef.current && floorRef.current.getBoundingClientRect();
              if (still && rect && pickAtRef.current) {
                setWalkPos(ps => ps.map((p, i) => (i === w ? { ...p, tap: p.tap + 1 } : p)));
                pickAtRef.current(still, (still.x / 100) * rect.width, (still.y / 100) * rect.height, 'helper');
              }
            }, 750);
          }
          loop();
        }, walkEvery * 1000 + w * 400);
      };
      loop();
    }
    return () => timers.forEach(t => clearTimeout(t));
  }, [walkers, walkEvery]);

  const spawnFloats = useCallback((list) => {
    setFloats(f => [...f.slice(-24), ...list]);
    const ids = list.map(i => i.id);
    setTimeout(() => setFloats(f => f.filter(x => !ids.includes(x.id))), 1800);
  }, []);

  const posOf = (e) => {
    const rect = floorRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // Münzen im Umkreis (Radius in % der Feldbreite) – für Magnet, Explosion, Strudel
  const nearby = (x, y, radius, exceptId, max = 99) => {
    const rect = floorRef.current.getBoundingClientRect();
    const r = (radius / 100) * rect.width;
    return itemsRef.current
      .filter(it => it.id !== exceptId && !it.charm && !it.chest && (it.coin || it.jeton || it.clover))
      .map(it => ({ it, d: Math.hypot(((it.x - x) / 100) * rect.width, ((it.y - y) / 100) * rect.height) }))
      .filter(o => o.d <= r).sort((a, b) => a.d - b.d).slice(0, max).map(o => o.it);
  };
  // Mehrere Münzen nacheinander einsammeln (sieht nach Kettenreaktion aus)
  const sweep = (list, stepMs = 55) => {
    list.forEach((it, i) => setTimeout(() => {
      const still = itemsRef.current.find(o => o.id === it.id);
      const rect = floorRef.current && floorRef.current.getBoundingClientRect();
      if (still && rect && pickAtRef.current) pickAtRef.current(still, (still.x / 100) * rect.width, (still.y / 100) * rect.height, 'chain');
    }, 40 + i * stepMs));
  };

  const pickedRef = useRef(new Set());
  const pickCountRef = useRef(0);
  const pick = (item, e) => { const { x, y } = posOf(e); gestureRef.current = { down: true, picked: true }; pickAt(item, x, y, false); };
  // mode: false = Antippen, 'auto' = goldener Finger, 'helper' = Helfer im Feld, 'chain' = Magnet/Explosion/Strudel
  const pickAt = (item, x, y, mode) => {
    const manual = !mode;
    if (manual) lastTapRef.current = Date.now();
    const fr = floorRef.current.getBoundingClientRect();
    const cx = fr.left + (item.x / 100) * fr.width;
    const cy = fr.top + (item.y / 100) * fr.height;
    const t = tfRef.current;
    const feverNow = feverRef.current > Date.now();

    // Schatztruhe: mehrmals antippen
    if (item.chest) {
      if (!manual) return;
      const hp = (item.hp || 5) - 1;
      sfx.tick(); fx.burst(cx, cy, { kind: 'chip-gold', count: 4, sparks: 4 });
      if (hp > 0) { setItems(cur => cur.map(o => (o.id === item.id ? { ...o, hp } : o))); return; }
      setItems(cur => cur.filter(o => o.id !== item.id));
      const n = onChest ? onChest() : 0;
      if (n) {
        sfx.bigWin(); fx.flash(cx, cy, { r: 260 }); fx.ring(cx, cy, { color: '#c084fc', r: 170, width: 8 });
        fx.burst(cx, cy, { kind: 'jeton', count: 24, sparks: 26, power: 1.4 });
        spawnFloats([{ id: ++uid, kind: 'jeton huge', x, y, text: `🧰 +${n} Jetons` }]);
      }
      return;
    }
    // Münzturm: jeder Tipp holt eine Münze vom Stapel
    const tower = item.tower || 0;
    if (pickedRef.current.has(item.id) && tower <= 1) return; // schon eingesammelt (z. B. per Magnet)
    if (tower > 1) setItems(cur => cur.map(o => (o.id === item.id ? { ...o, tower: tower - 1, born: o.born + 400 } : o)));
    else { pickedRef.current.add(item.id); setItems(cur => cur.filter(o => o.id !== item.id)); }
    if (pickedRef.current.size > 500) pickedRef.current = new Set();

    if (item.charm) {
      if (onPickCharm(item.charm.id)) {
        sfx.charm(); onCharm(item.charm);
        fx.flash(cx, cy, { r: 260, power: 0.9 });
        fx.ring(cx, cy, { color: '#fbbf24', r: 160, width: 8 });
        fx.burst(cx, cy, { kind: 'charm', count: 10, sparks: 24, power: 1.3 });
      }
      return;
    }
    if (item.clover) {
      if (onClover) onClover(3);
      sfx.charm(); fx.burst(cx, cy, { kind: 'chip-green', count: 12, sparks: 14 });
      spawnFloats([{ id: ++uid, kind: 'gold', x, y, text: '☘️ +3 Gratis-Spins' }]);
      return;
    }
    if (item.jeton) {
      if (onPickJeton && onPickJeton()) {
        sfx.gold();
        fx.burst(cx, cy, { kind: 'jeton', count: 10, sparks: 10 });
        const pill = document.querySelector('.mg-money .mg-jpill') || document.querySelector('.mg-money .coin3d');
        fx.fly(cx, cy, pill, { kind: 'jeton', r: 18, onArrive: () => { catchAt(pill); sfx.clink(); } });
        spawnFloats([{ id: ++uid, kind: 'jeton', x, y, text: `🟣 +${JETON_COIN_VALUE} Jetons` }]);
      }
      return;
    }
    const nowMs = Date.now();
    const c = manual ? comboRef.current : { n: comboRef.current.n };
    if (manual) {
      c.n = nowMs - c.last < comboWindowRef.current ? c.n + 1 : Math.floor(c.n * t.echo) + 1;
      if (c.n === 1) c.shield = 0;
      c.last = nowMs;
      setCombo(c.n);
    }
    if (!item.coin) return;
    // Extra-Faktoren: Turm ×2, Goldene Serie ×3, Fieber ×2
    const streak = manual && t.streakEvery && c.n > 0 && c.n % t.streakEvery === 0;
    const mult = (tower > 0 ? 2 : 1) * (streak ? 3 : 1) * (feverNow ? 2 : 1);
    const r = onPickup(item.coin.id, item.gold, manual ? c.n : (mode === 'chain' ? c.n : 0), { mult, helper: mode === 'helper' });
    if (!r) return;
    if (item.gold) { sfx.gold(); setShake(true); setTimeout(() => setShake(false), 350); } else if (manual) sfx.coin(c.n); else sfx.tick();
    if (r.levelUp) sfx.levelUp();
    // Effekte: Splitter, Funken und die Münze fliegt in den Geldzähler
    const kind = item.gold ? 'gold' : item.coin.kind;
    const heat = Math.min(1, c.n / COMBO_MAX);
    fx.burst(cx, cy, { kind, count: item.gold ? 22 : !manual ? 4 : 6 + Math.round(heat * 6), sparks: item.gold ? 26 : !manual ? 3 : 5 + Math.round(heat * 10), power: item.gold ? 1.4 : 1 + heat * 0.3 });
    if (item.gold) { fx.flash(cx, cy, { r: 240 }); fx.ring(cx, cy, { color: '#fde047', r: 150, width: 8 }); }
    const wallet = document.querySelector('.mg-money .coin3d');
    const copies = item.gold ? 5 : 1;
    for (let i = 0; i < copies; i++) {
      fx.fly(cx, cy, wallet, { kind, r: Math.max(12, item.coin.size * 0.36), delay: i * 0.06, onArrive: i === 0 ? () => { catchAt(wallet); sfx.clink(); } : undefined });
    }
    // Größere Zahl, wenn die Münze viel mehr wert ist als üblich
    const ratio = r.money / Math.max(1e-9, pickEVRef.current);
    const size = item.gold || ratio >= 6 ? ' huge' : ratio >= 2.5 ? ' big' : '';
    const list = [{ id: ++uid, kind: (item.gold ? 'gold' : 'find') + size, x, y, text: `${item.gold ? '🥇 GOLD! ' : ''}+${fmtMoney(r.money)}` }];
    if (streak) list.push({ id: ++uid, kind: 'gold', x, y: y - 44, text: '⭐ SERIE ×3' });
    if (r.album) {
      list.push({ id: ++uid, kind: 'gold', x, y: y - 80, text: `📖 ${r.album.icon} ${r.album.name}${r.album.dup ? ' (doppelt)' : '!'}` });
      if (onAlbum) onAlbum(r.album);
    }
    if (r.jetons && showJetons) list.push({ id: ++uid, kind: 'jeton', x, y: y - 50, text: `🟣 +${r.jetons} Jeton${r.jetons > 1 ? 's' : ''}${r.comboJeton ? ' (Combo-Kasse)' : ''}` });
    if (r.levelUp) list.push({ id: ++uid, kind: 'level', x, y: y - 36, text: `⬆️ Sammeln Lv ${r.levelUp}` });
    if (manual && COMBO_MILESTONES.includes(c.n)) {
      list.push({ id: ++uid, kind: 'gold', x, y: y - 60, text: `🔥 COMBO ×${c.n}!` });
      sfx.achievement();
      setShake(true); setTimeout(() => setShake(false), 350);
    }
    // Fieber zünden
    if (manual && t.feverAt && c.n >= t.feverAt && !feverNow) {
      const until = Date.now() + t.feverSec * 1000;
      feverRef.current = until; setFeverUntil(until);
      sfx.bigWin(); fx.flash(cx, cy, { r: 320, power: 0.7 }); fx.ring(cx, cy, { color: '#fb7185', r: 220, width: 10 });
      list.push({ id: ++uid, kind: 'fever huge', x, y: y - 70, text: '🌡️ FIEBER!' });
    }
    spawnFloats(list);

    if (manual) {
      // Funkenflug: bei jeder vollen 10er-Combo fällt eine Goldmünze
      if (t.sparkEvery && c.n % t.sparkEvery === 0) setTimeout(() => dropCoin(10 + Math.random() * 80, 20 + Math.random() * 65, true), 250);
      // Doppelgänger: jede 25. Münze zerfällt in 2 neue
      pickCountRef.current += 1;
      if (t.splitEvery && pickCountRef.current % t.splitEvery === 0) {
        setTimeout(() => { dropCoin(item.x - 7, item.y - 4); dropCoin(item.x + 7, item.y + 4); }, 120);
        spawnFloats([{ id: ++uid, kind: 'level', x, y: y + 30, text: '✨ Doppelgänger!' }]);
      }
      // Inferno: im Fieber holt jeder Tipp alles
      if (t.inferno && feverNow) { sweep(nearby(item.x, item.y, 200, item.id), 35); return; }
      // Magnet: Münzen aus der Nähe fliegen mit
      if (t.magnet) sweep(nearby(item.x, item.y, t.magnetRadius, item.id, t.magnet), 70);
    }
    // Kettenreaktion: Goldmünzen explodieren
    if (item.gold && t.blast && mode !== 'chain') {
      fx.ring(cx, cy, { color: '#fb923c', r: (t.blast / 100) * fr.width, width: 10, life: 0.45 });
      sweep(nearby(item.x, item.y, t.blast, item.id), 45);
    }
  };

  pickAtRef.current = pickAt;

  // Wischen (Skilltree): mit gedrücktem Finger über Münzen fahren
  const gestureRef = useRef({ down: false, picked: false, e: null });
  const onFloorDown = (e) => {
    gestureRef.current = { down: true, picked: false, x: e.clientX, y: e.clientY };
    if (!tf.swipe) missClick(e);
  };
  const onFloorMove = (e) => {
    const g = gestureRef.current;
    if (!tf.swipe || !g.down) return;
    const rect = floorRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left; const py = e.clientY - rect.top;
    const hit = itemsRef.current.find(it => !it.charm && !pickedRef.current.has(it.id) && (it.coin || it.jeton || it.clover)
      && Math.hypot((it.x / 100) * rect.width - px, (it.y / 100) * rect.height - py) < (it.coin ? it.coin.size : 46) * 0.7);
    if (hit) { g.picked = true; pickAt(hit, px, py, false); }
  };
  const onFloorUp = (e) => {
    const g = gestureRef.current;
    if (tf.swipe && g.down && !g.picked) missClick(e);
    g.down = false;
  };

  const missClick = (e) => {
    if (onMiss) onMiss();
    lastTapRef.current = Date.now();
    const c = comboRef.current;
    const { x, y } = posOf(e);
    // Combo-Schild: einige Fehlklicks werden verziehen
    if (c.n > 0 && (c.shield || 0) < tf.shield) {
      c.shield = (c.shield || 0) + 1;
      spawnFloats([{ id: ++uid, kind: 'level', x, y, text: `🛡️ Schild (${tf.shield - c.shield} übrig)` }]);
      return;
    }
    if (c.n > 0) { c.n = Math.floor(c.n * tf.echo); c.shield = 0; c.last = Date.now(); setCombo(c.n); }
    if (Math.random() > 0.35) return;
    spawnFloats([{ id: ++uid, kind: 'junk', x, y, text: randomJunk(stateRef.current) + '…' }]);
  };

  const clickSack = (e) => {
    e.stopPropagation();
    const { x, y } = posOf(e);
    setSack(null);
    const res = onOpenSack();
    if (!res) return;
    fx.flash(e.clientX, e.clientY, { r: 280, power: 0.9 });
    fx.ring(e.clientX, e.clientY, { color: '#ffd34d', r: 180, width: 9 });
    fx.burst(e.clientX, e.clientY, { kind: 'gold', count: 26, sparks: 30, power: 1.5 });
    const wallet = document.querySelector('.mg-money .coin3d');
    for (let i = 0; i < 8; i++) fx.fly(e.clientX, e.clientY, wallet, { kind: 'gold', r: 16, delay: i * 0.05, onArrive: i === 7 ? () => { catchAt(wallet); sfx.clink(); } : undefined });
    if (res.kind === 'frenzy') {
      sfx.bigWin();
      spawnFloats([{ id: ++uid, kind: 'gold', x, y, text: '🌧️ GELDREGEN!' }]);
    } else {
      sfx.gold();
      setShake(true); setTimeout(() => setShake(false), 350);
      spawnFloats([{ id: ++uid, kind: 'gold', x, y, text: `💰 +${fmtMoney(res.amount)}${res.kind === 'both' ? ' + 🌧️ GELDREGEN!' : ''}` }]);
    }
  };

  // Schwarzes Loch: saugt alle Münzen vom Feld
  const clickHole = (e) => {
    e.stopPropagation();
    const h = hole;
    setHole(null);
    if (!h) return;
    const fr = floorRef.current.getBoundingClientRect();
    const hx = fr.left + (h.x / 100) * fr.width; const hy = fr.top + (h.y / 100) * fr.height;
    sfx.bigWin(); fx.flash(hx, hy, { r: 300, power: 0.6 }); fx.ring(hx, hy, { color: '#a78bfa', r: 260, width: 12, life: 0.7 });
    sweep(nearby(h.x, h.y, 300, null), 40);
    spawnFloats([{ id: ++uid, kind: 'fever huge', x: (h.x / 100) * fr.width, y: (h.y / 100) * fr.height - 30, text: '🕳️ SCHWARZES LOCH!' }]);
  };

  const sk = state.skills;
  const frenzyLeft = Math.max(0, Math.ceil(((state.frenzyUntil || 0) - Date.now()) / 1000));
  const comboLeft = combo > 0 ? Math.max(0, 1 - (Date.now() - comboRef.current.last) / comboWindow) : 0;
  const feverLeft = Math.max(0, Math.ceil((feverUntil - Date.now()) / 1000));
  const range = `${derived.coins[0].label} ${derived.coins[0].unit} – ${derived.coins[3].label} ${derived.coins[3].unit}`;
  const bar = tf.jetonBar;
  const pills = [
    derived.early && { k: 'early', t: '🌅 Frühschicht · Helfer ×3' },
    derived.shift && { k: 'shift', t: '⏰ Schichtwechsel · Helfer ×2' },
    midasOn && { k: 'midas', t: '👑 Midas · alles wird zu Gold' },
  ].filter(Boolean);

  return (
    <div>
      {showGoal && <GoalBanner state={state} onMove={onMove} hl={hl === 'goal'} />}

      <div ref={floorRef} data-tut="floor" className={`mg-floor floor-${loc.id} cskin-${(state.cosmetics || {}).chip || 'classic'} fskin-${(state.cosmetics || {}).floor || 'default'}${combo >= 2 ? ' hot' : ''}${feverOn ? ' fever' : ''}${midasOn ? ' midas' : ''}${tf.swipe ? ' swipe' : ''}${shake ? ' shake' : ''}${derived.frenzy ? ' frenzy' : ''}${hl === 'floor' ? ' mg-hl' : ''}`}
        style={{ '--heat': Math.min(1, combo / COMBO_MAX) }} onPointerDown={onFloorDown} onPointerMove={onFloorMove} onPointerUp={onFloorUp} onPointerLeave={onFloorUp} onPointerCancel={onFloorUp}>
        <div className="mg-floor-ambient" />
        {deco.map((d, i) => (
          <div key={i} className="mg-floor-deco" style={{ left: `${d.x}%`, top: `${d.y}%`, transform: `rotate(${d.r}deg)` }}>{d.e}</div>
        ))}
        <div className="mg-floor-vignette" />
        <div className="mg-floor-loc">{loc.icon} {loc.name} · 🪙 {range}</div>
        {derived.autoCoins > 0 && <div className="mg-floor-auto">🤖 Helfer: {fmt(derived.autoCoins, 1)} Münzen/s</div>}
        {pills.length > 0 && <div className="mg-floor-pills">{pills.map(p => <span key={p.k} className={`mg-fpill ${p.k}`}>{p.t}</span>)}</div>}
        {state.stats.finds < 3 && items.length === 0 && !derived.frenzy && (
          <div className="mg-floor-hint">
            <div className="txt">Halt die Augen offen…</div>
            <div className="sub">Gleich taucht eine Münze auf. Klick sie an, bevor sie weg ist!</div>
          </div>
        )}
        {items.map(it => <Coin key={it.id} item={it} onPick={pick} />)}
        {walkPos.map((w, i) => (
          <div key={i} className="mg-walker" style={{ left: `${w.x}%`, top: `${w.y}%` }} aria-hidden="true">
            <span key={w.tap} className={`${w.tap ? 'grab' : ''}${w.flip ? ' flip' : ''}`}>{helperIcon}</span>
          </div>
        ))}
        {fingerEvery > 0 && (
          <div className="mg-finger" style={{ left: `${finger.x}%`, top: `${finger.y}%` }} aria-hidden="true">
            <span key={finger.tap} className={finger.tap ? 'tap' : ''}>👆</span>
          </div>
        )}
        {sack && (
          <button key={sack.id} className="mg-sack" onPointerDown={clickSack} aria-label="Geldsack schnappen"><span>💰</span></button>
        )}
        {hole && (
          <button key={hole.id} className="mg-hole" style={{ left: `${hole.x}%`, top: `${hole.y}%` }} onPointerDown={clickHole} aria-label="Schwarzes Loch antippen"><span /></button>
        )}
        {combo >= 2 && (
          <div className="mg-combo">
            <div key={combo} className="n pop">COMBO ×{combo}</div>
            <div style={{ color: '#ffd9a8', fontSize: 12, fontWeight: 900 }}>+{Math.round((comboMult(combo) - 1) * 100)}% Wert{combo >= COMBO_MAX ? ' (MAX)' : ''}{tf.shield > 0 ? ` · ${'🛡️'.repeat(Math.max(0, tf.shield - (comboRef.current.shield || 0)))}` : ''}</div>
            <div className="bar"><div style={{ width: `${comboLeft * 100}%` }} /></div>
          </div>
        )}
        {feverOn && <div className="mg-fever-banner">🌡️ FIEBER · noch {feverLeft}s · alles ×2{tf.inferno ? ' · ☄️ Inferno: ein Tipp holt alles' : ''}</div>}
        {derived.frenzy && !feverOn && <div className="mg-frenzy-banner">🌧️ GELDREGEN · noch {frenzyLeft}s · 5× so viele Münzen!</div>}
        {floats.map(f => (
          <div key={f.id} className={`mg-float ${f.kind}`} style={{ left: f.x, top: f.y }}>{f.text}</div>
        ))}
      </div>

      {showJetons && (
        <div data-tut="jetonbar" className={`mg-jetonbar${hl === 'jetonbar' ? ' mg-hl' : ''}`} title="Jede angetippte Münze füllt die Leiste – Helfer zählen nicht">
          <span>🟣 Nächster Jeton</span>
          <div className="bar"><div style={{ width: `${((state.jetonProgress || 0) / bar) * 100}%` }} /></div>
          <b>{state.jetonProgress || 0}/{bar}</b>
        </div>
      )}
      {showExtras && <>
      <div className="mg-statrow">
        <div className="mg-stat"><div className="k">🪙 Neue Münzen</div><div className="v">{fmt(derived.spawnRate * 60, 0)}/min</div></div>
        <div className="mg-stat"><div className="k">💎 Münzwert</div><div className="v">×{fmt(derived.valueMult)}</div></div>
        <div className="mg-stat"><div className="k">🫳 Pro Münze (Ø)</div><div className="v">{fmtMoney(derived.pickEV)}</div></div>
        <div className="mg-stat"><div className="k">⚡ Wenn du alles einsammelst</div><div className="v" style={{ color: 'var(--green)' }}>{fmtMoney(derived.manualPerSec)}/s</div></div>
      </div>

      <div className="mg-panel" style={{ marginTop: 12 }}>
        <div className="mg-label">Skills · steigen durchs Tun</div>
        <Skill id="suchen" skill={sk.suchen} />
        <Skill id="management" skill={sk.management} />
        <Skill id="zocken" skill={sk.zocken} />
      </div>
      </>}
    </div>
  );
}
