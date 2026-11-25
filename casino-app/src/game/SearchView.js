import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  LOCATIONS, SKILLS, xpForLevel, fmt, fmtMoney, rollSpawn, randomJunk, comboMult,
  MAX_ON_FLOOR, COIN_LIFETIME, GOLD_LIFETIME, CHARM_LIFETIME, COMBO_WINDOW_MS, COMBO_MAX, COMBO_MILESTONES,
  SACK_MIN_SEC, SACK_MAX_SEC, JETON_PER_COINS, JETON_COIN_VALUE,
} from './economy';
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

// Eine Münze bzw. ein Chip auf dem Boden
function Coin({ item, onPick }) {
  const { coin, gold, charm, life } = item;
  if (!coin && !charm && !item.jeton) return null;
  const style = {
    left: `${item.x}%`, top: `${item.y}%`,
    '--size': `${charm || !coin ? 46 : coin.size}px`, '--rot': `${item.rot}deg`, '--glint': `${item.glint}s`,
    animationDuration: `${life}s`,
  };
  const pick = (e) => { e.stopPropagation(); onPick(item, e); };
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
  return (
    <button className={`mg-coin ${coin.kind}${gold ? ' gold' : ''}`} style={style} onPointerDown={pick} aria-label={`${coinLabel(coin)} aufheben`}>
      <span className="shadow" /><span className="body"><span className="face"><b>{coin.label}</b><i>{coin.unit}</i></span></span>
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

export default function SearchView({ state, derived, onPickup, onPickCharm, onOpenSack, onMove, onCharm, hl = '', showGoal = true, showExtras = true, allowSack = true, onPickJeton, showJetons = false, onAlbum, fingerEvery = 0, onMiss, onSecret }) {
  const [items, setItems] = useState([]);
  const [floats, setFloats] = useState([]);
  const floorRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const rateRef = useRef(derived.spawnRate);
  rateRef.current = derived.spawnRate;
  const frenzyRef = useRef(derived.frenzy);
  frenzyRef.current = derived.frenzy;
  const comboRef = useRef({ n: 0, last: 0 });
  const pickEVRef = useRef(derived.pickEV);
  pickEVRef.current = derived.pickEV;
  const allowSackRef = useRef(allowSack);
  allowSackRef.current = allowSack;
  const [combo, setCombo] = useState(0);
  const [sack, setSack] = useState(null);
  const [shake, setShake] = useState(false);
  const loc = LOCATIONS[state.location];

  const deco = useMemo(() => {
    const list = DECO[loc.id] || [];
    return Array.from({ length: 8 }, (_, i) => ({
      e: list[i % list.length], x: 5 + ((i * 37) % 88), y: 8 + ((i * 53) % 80), r: (i * 47) % 360,
    }));
  }, [loc.id]);

  // Beim Ortswechsel den Boden leeren
  useEffect(() => { setItems([]); }, [loc.id]);

  // Münzen erscheinen lassen und verschwinden lassen
  useEffect(() => {
    let acc = 0.6; // erste Münze kommt schnell
    let last = performance.now();
    let nextSack = performance.now() + 40000; // erster Geldsack nach 40 s
    const id = setInterval(() => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 1);
      last = now;
      if (document.visibilityState === 'hidden') return;
      acc += rateRef.current * dt;
      if (now >= nextSack && allowSackRef.current) {
        nextSack = now + (SACK_MIN_SEC + Math.random() * (SACK_MAX_SEC - SACK_MIN_SEC)) * 1000;
        setSack({ id: ++uid, born: now });
      }
      setSack(cur => (cur && now - cur.born > 9000 ? null : cur));
      // Combo verfällt
      if (comboRef.current.n > 0 && Date.now() - comboRef.current.last > COMBO_WINDOW_MS) {
        comboRef.current.n = 0;
        setCombo(0);
      }
      const maxFloor = frenzyRef.current ? MAX_ON_FLOOR * 2 : MAX_ON_FLOOR;
      setItems(cur => {
        let list = cur.filter(it => now - it.born < it.life * 1000);
        while (acc >= 1) {
          acc -= 1;
          if (list.length >= maxFloor) continue;
          const sp = rollSpawn(stateRef.current);
          const { x, y } = freeSpot(list);
          list = [...list, {
            id: ++uid, x, y, born: now, rot: Math.random() * 60 - 30, glint: 1.2 + Math.random() * 4,
            coin: sp.coin, gold: sp.gold, charm: sp.type === 'charm' ? sp.charm : null, jeton: sp.type === 'jeton',
            life: sp.type === 'charm' || sp.type === 'jeton' ? CHARM_LIFETIME : sp.gold ? GOLD_LIFETIME : COIN_LIFETIME,
          }];
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
      }, 290);
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
        const list = itemsRef.current.filter(it => !it.charm && (it.coin || it.jeton));
        if (list.length && document.visibilityState !== 'hidden') {
          const target = list[Math.floor(Math.random() * list.length)];
          setFinger(f => ({ ...f, x: target.x, y: target.y }));
          t2 = setTimeout(() => {
            const still = itemsRef.current.find(it => it.id === target.id);
            const rect = floorRef.current && floorRef.current.getBoundingClientRect();
            if (still && rect && pickAtRef.current) {
              setFinger(f => ({ ...f, tap: f.tap + 1 }));
              pickAtRef.current(still, (still.x / 100) * rect.width, (still.y / 100) * rect.height, true);
            }
          }, 480);
        }
        loop();
      }, fingerEvery * 1000);
    };
    loop();
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [fingerEvery]);

  const spawnFloats = useCallback((list) => {
    setFloats(f => [...f.slice(-20), ...list]);
    const ids = list.map(i => i.id);
    setTimeout(() => setFloats(f => f.filter(x => !ids.includes(x.id))), 1800);
  }, []);

  const posOf = (e) => {
    const rect = floorRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const pick = (item, e) => { const { x, y } = posOf(e); pickAt(item, x, y, false); };
  // auto: vom goldenen Finger aufgehoben (keine Combo)
  const pickAt = (item, x, y, auto) => {
    if (!auto) lastTapRef.current = Date.now();
    setItems(cur => cur.filter(o => o.id !== item.id));
    const fr = floorRef.current.getBoundingClientRect();
    const cx = fr.left + (item.x / 100) * fr.width;
    const cy = fr.top + (item.y / 100) * fr.height;
    if (item.charm) {
      if (onPickCharm(item.charm.id)) {
        sfx.charm(); onCharm(item.charm);
        fx.flash(cx, cy, { r: 260, power: 0.9 });
        fx.ring(cx, cy, { color: '#fbbf24', r: 160, width: 8 });
        fx.burst(cx, cy, { kind: 'charm', count: 10, sparks: 24, power: 1.3 });
      }
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
    const c = auto ? { n: 0 } : comboRef.current;
    if (!auto) {
      c.n = nowMs - c.last < COMBO_WINDOW_MS ? c.n + 1 : 0;
      c.last = nowMs;
      setCombo(c.n);
    }
    if (!item.coin) return;
    const r = onPickup(item.coin.id, item.gold, c.n);
    if (!r) return;
    if (item.gold) { sfx.gold(); setShake(true); setTimeout(() => setShake(false), 350); } else if (!auto) sfx.coin(c.n); else sfx.tick();
    if (r.levelUp) sfx.levelUp();
    // Effekte: Splitter, Funken und die Münze fliegt in den Geldzähler
    const kind = item.gold ? 'gold' : item.coin.kind;
    const heat = Math.min(1, c.n / COMBO_MAX);
    fx.burst(cx, cy, { kind, count: item.gold ? 22 : auto ? 4 : 6 + Math.round(heat * 6), sparks: item.gold ? 26 : auto ? 3 : 5 + Math.round(heat * 10), power: item.gold ? 1.4 : 1 + heat * 0.3 });
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
    if (r.album) {
      list.push({ id: ++uid, kind: 'gold', x, y: y - 80, text: `📖 ${r.album.icon} ${r.album.name}${r.album.dup ? ' (doppelt)' : '!'}` });
      if (onAlbum) onAlbum(r.album);
    }
    if (r.jetons && showJetons) list.push({ id: ++uid, kind: 'jeton', x, y: y - 50, text: `🟣 +${r.jetons} Jeton` });
    if (r.levelUp) list.push({ id: ++uid, kind: 'level', x, y: y - 36, text: `⬆️ Sammeln Lv ${r.levelUp}` });
    if (!auto && COMBO_MILESTONES.includes(c.n)) {
      list.push({ id: ++uid, kind: 'gold', x, y: y - 60, text: `🔥 COMBO ×${c.n}!` });
      sfx.achievement();
      setShake(true); setTimeout(() => setShake(false), 350);
    }
    spawnFloats(list);
  };

  pickAtRef.current = pickAt;

  const missClick = (e) => {
    if (onMiss) onMiss();
    lastTapRef.current = Date.now();
    if (comboRef.current.n > 0) { comboRef.current.n = 0; setCombo(0); }
    if (Math.random() > 0.35) return;
    const { x, y } = posOf(e);
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
      spawnFloats([{ id: ++uid, kind: 'gold', x, y, text: `💰 +${fmtMoney(res.amount)}` }]);
    }
  };

  const sk = state.skills;
  const frenzyLeft = Math.max(0, Math.ceil(((state.frenzyUntil || 0) - Date.now()) / 1000));
  const comboLeft = combo > 0 ? Math.max(0, 1 - (Date.now() - comboRef.current.last) / COMBO_WINDOW_MS) : 0;
  const range = `${derived.coins[0].label} ${derived.coins[0].unit} – ${derived.coins[3].label} ${derived.coins[3].unit}`;

  return (
    <div>
      {showGoal && <GoalBanner state={state} onMove={onMove} hl={hl === 'goal'} />}

      <div ref={floorRef} data-tut="floor" className={`mg-floor floor-${loc.id} cskin-${(state.cosmetics || {}).chip || 'classic'} fskin-${(state.cosmetics || {}).floor || 'default'}${combo >= 2 ? ' hot' : ''}${shake ? ' shake' : ''}${derived.frenzy ? ' frenzy' : ''}${hl === 'floor' ? ' mg-hl' : ''}`} style={{ '--heat': Math.min(1, combo / COMBO_MAX) }} onPointerDown={missClick}>
        <div className="mg-floor-ambient" />
        {deco.map((d, i) => (
          <div key={i} className="mg-floor-deco" style={{ left: `${d.x}%`, top: `${d.y}%`, transform: `rotate(${d.r}deg)` }}>{d.e}</div>
        ))}
        <div className="mg-floor-vignette" />
        <div className="mg-floor-loc">{loc.icon} {loc.name} · 🪙 {range}</div>
        {derived.autoCoins > 0 && <div className="mg-floor-auto">🤖 Helfer: {fmt(derived.autoCoins, 1)} Münzen/s</div>}
        {state.stats.finds < 3 && items.length === 0 && !derived.frenzy && (
          <div className="mg-floor-hint">
            <div className="txt">Halt die Augen offen…</div>
            <div className="sub">Gleich taucht eine Münze auf. Klick sie an, bevor sie weg ist!</div>
          </div>
        )}
        {items.map(it => <Coin key={it.id} item={it} onPick={pick} />)}
        {fingerEvery > 0 && (
          <div className="mg-finger" style={{ left: `${finger.x}%`, top: `${finger.y}%` }} aria-hidden="true">
            <span key={finger.tap} className={finger.tap ? 'tap' : ''}>👆</span>
          </div>
        )}
        {sack && (
          <button key={sack.id} className="mg-sack" onPointerDown={clickSack} aria-label="Geldsack schnappen"><span>💰</span></button>
        )}
        {combo >= 2 && (
          <div className="mg-combo">
            <div key={combo} className="n pop">COMBO ×{combo}</div>
            <div style={{ color: '#ffd9a8', fontSize: 12, fontWeight: 900 }}>+{Math.round((comboMult(combo) - 1) * 100)}% Wert{combo >= COMBO_MAX ? ' (MAX)' : ''}</div>
            <div className="bar"><div style={{ width: `${comboLeft * 100}%` }} /></div>
          </div>
        )}
        {derived.frenzy && <div className="mg-frenzy-banner">🌧️ GELDREGEN · noch {frenzyLeft}s · 5× so viele Münzen!</div>}
        {floats.map(f => f.kind === 'chip' ? (
          <div key={f.id} className="mg-chip" style={{ left: f.x - 9, top: f.y - 9, '--dx': `${f.dx}px`, '--dy': `${f.dy}px`, '--rot': `${f.rot}deg` }}>{f.text}</div>
        ) : (
          <div key={f.id} className={`mg-float ${f.kind}`} style={{ left: f.x, top: f.y }}>{f.text}</div>
        ))}
      </div>

      {showJetons && (
        <div data-tut="jetonbar" className={`mg-jetonbar${hl === 'jetonbar' ? ' mg-hl' : ''}`} title="Jede angetippte Münze füllt die Leiste – Helfer zählen nicht">
          <span>🟣 Nächster Jeton</span>
          <div className="bar"><div style={{ width: `${((state.jetonProgress || 0) / JETON_PER_COINS) * 100}%` }} /></div>
          <b>{state.jetonProgress || 0}/{JETON_PER_COINS}</b>
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
