import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  LOCATIONS, SKILLS, xpForLevel, fmt, fmtMoney, rollSpawn, randomJunk, comboMult,
  MAX_ON_FLOOR, COIN_LIFETIME, GOLD_LIFETIME, CHARM_LIFETIME, COMBO_WINDOW_MS, COMBO_MAX,
  SACK_MIN_SEC, SACK_MAX_SEC,
} from './economy';
import { sfx } from './sound';

const DECO = {
  hinterhof: ['🥫', '🚬', '📰', '🗑️', '🍌', '🧦'],
  kneipe: ['🍺', '🥜', '🎯', '🍻', '🧂'],
  spielhalle: ['🕹️', '🍿', '🎟️', '👾', '🥤'],
  casino: ['🍸', '🫒', '🎩', '💍', '🃏'],
  vegas: ['🌴', '🕶️', '🎰', '💃', '🪩'],
  monaco: ['🍾', '⚓', '🛥️', '⌚', '🦞'],
  mond: ['🌑', '🛰️', '⭐', '🪐', '👨‍🚀'],
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
  const style = {
    left: `${item.x}%`, top: `${item.y}%`,
    '--size': `${charm ? 46 : coin.size}px`, '--rot': `${item.rot}deg`,
    animationDuration: `${life}s`,
  };
  const pick = (e) => { e.stopPropagation(); onPick(item, e); };
  if (charm) {
    return (
      <button className="mg-coin charm" style={style} onPointerDown={pick} aria-label={`${charm.name} aufheben`}>
        <span>{charm.icon}</span>
      </button>
    );
  }
  return (
    <button className={`mg-coin ${coin.kind}${gold ? ' gold' : ''}`} style={style} onPointerDown={pick} aria-label={`${coinLabel(coin)} aufheben`}>
      <span className="face"><b>{coin.label}</b><i>{coin.unit}</i></span>
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
    <div className={`mg-panel mg-goal${hl ? ' mg-hl' : ''}`}>
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

export default function SearchView({ state, derived, onPickup, onPickCharm, onOpenSack, onMove, onCharm, hl = '' }) {
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
      if (now >= nextSack) {
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
            id: ++uid, x, y, born: now, rot: Math.random() * 60 - 30,
            coin: sp.coin, gold: sp.gold, charm: sp.type === 'charm' ? sp.charm : null,
            life: sp.type === 'charm' ? CHARM_LIFETIME : sp.gold ? GOLD_LIFETIME : COIN_LIFETIME,
          }];
        }
        return list.length === cur.length && list.every((o, i) => o === cur[i]) ? cur : list;
      });
    }, 100);
    return () => clearInterval(id);
  }, []);

  const spawnFloats = useCallback((list) => {
    setFloats(f => [...f.slice(-20), ...list]);
    const ids = list.map(i => i.id);
    setTimeout(() => setFloats(f => f.filter(x => !ids.includes(x.id))), 1800);
  }, []);

  const posOf = (e) => {
    const rect = floorRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const pick = (item, e) => {
    setItems(cur => cur.filter(o => o.id !== item.id));
    const { x, y } = posOf(e);
    if (item.charm) {
      if (onPickCharm(item.charm.id)) { sfx.charm(); onCharm(item.charm); }
      return;
    }
    const nowMs = Date.now();
    const c = comboRef.current;
    c.n = nowMs - c.last < COMBO_WINDOW_MS ? Math.min(c.n + 1, COMBO_MAX) : 0;
    c.last = nowMs;
    setCombo(c.n);
    const r = onPickup(item.coin.id, item.gold, c.n);
    if (!r) return;
    if (item.gold) { sfx.gold(); setShake(true); setTimeout(() => setShake(false), 350); } else sfx.coin(c.n);
    if (r.levelUp) sfx.levelUp();
    const list = [{ id: ++uid, kind: item.gold ? 'gold' : 'find', x, y, text: `${item.gold ? '🥇 GOLD! ' : ''}+${fmtMoney(r.money)}` }];
    const n = item.gold ? 7 : 3;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 50;
      list.push({ id: ++uid, kind: 'chip', x, y, dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist - 30, rot: Math.random() * 720 - 360, text: '✨' });
    }
    if (r.levelUp) list.push({ id: ++uid, kind: 'level', x, y: y - 36, text: `⬆️ Sammeln Lv ${r.levelUp}` });
    spawnFloats(list);
  };

  const missClick = (e) => {
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
      <GoalBanner state={state} onMove={onMove} hl={hl === 'goal'} />

      <div ref={floorRef} className={`mg-floor floor-${loc.id}${shake ? ' shake' : ''}${derived.frenzy ? ' frenzy' : ''}${hl === 'floor' ? ' mg-hl' : ''}`} onPointerDown={missClick}>
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
        {sack && (
          <button key={sack.id} className="mg-sack" onPointerDown={clickSack} aria-label="Geldsack schnappen"><span>💰</span></button>
        )}
        {combo >= 2 && (
          <div className="mg-combo">
            <div key={combo} className="n pop">COMBO ×{combo}</div>
            <div style={{ color: '#ffd9a8', fontSize: 12, fontWeight: 900 }}>+{Math.round((comboMult(combo) - 1) * 100)}% Wert</div>
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
    </div>
  );
}
