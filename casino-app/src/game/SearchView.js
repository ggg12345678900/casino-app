import React, { useState, useRef, useCallback, useMemo } from 'react';
import { LOCATIONS, SKILLS, xpForLevel, fmt, fmtMoney } from './economy';

const DECO = {
  hinterhof: ['🥫', '🚬', '📰', '🗑️', '🍌', '🧦'],
  kneipe: ['🍺', '🥜', '🎯', '🍻', '🧂'],
  spielhalle: ['🕹️', '🍿', '🎟️', '👾', '🥤'],
  casino: ['🍸', '🫒', '🎩', '💍', '🃏'],
  vegas: ['🌴', '🕶️', '🎰', '💃', '🪩'],
  monaco: ['🍾', '⚓', '🛥️', '⌚', '🦞'],
  mond: ['🌑', '🛰️', '⭐', '🪐', '👨‍🚀'],
};

let floatId = 0;

function GoalBanner({ state, onMove }) {
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
    <div className="mg-panel mg-goal">
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

export default function SearchView({ state, derived, onSearch, onMove, onCharm }) {
  const [floats, setFloats] = useState([]);
  const floorRef = useRef(null);
  const loc = LOCATIONS[state.location];

  // Deko-Objekte pro Ort einmal zufällig verteilen
  const deco = useMemo(() => {
    const list = DECO[loc.id] || [];
    return Array.from({ length: 9 }, (_, i) => ({
      e: list[i % list.length], x: 5 + ((i * 37) % 88), y: 8 + ((i * 53) % 80), r: (i * 47) % 360,
    }));
  }, [loc.id]);

  const spawn = useCallback((items) => {
    setFloats(f => [...f.slice(-24), ...items]);
    const ids = items.map(i => i.id);
    setTimeout(() => setFloats(f => f.filter(x => !ids.includes(x.id))), 1800);
  }, []);

  const handleClick = (e) => {
    const rect = floorRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const r = onSearch();
    if (!r) return;
    const items = [];
    if (r.gold > 0) {
      items.push({ id: ++floatId, kind: 'gold', x, y, text: `🥇 GOLDCHIP! +${fmtMoney(r.money)}` });
    } else if (r.money > 0) {
      items.push({ id: ++floatId, kind: 'find', x, y, text: `+${fmtMoney(r.money)}` });
    } else if (r.junk && Math.random() < 0.45) {
      items.push({ id: ++floatId, kind: 'junk', x, y, text: r.junk + '…' });
    }
    if (r.found > 0) {
      const n = Math.min(6, 1 + r.gold * 4 + Math.floor(Math.log10(r.found + 1) * 2));
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 60;
        items.push({ id: ++floatId, kind: 'chip', x, y, dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist - 30, rot: Math.random() * 720 - 360, text: r.gold ? '🟡' : '🪙' });
      }
    }
    if (r.levelUp) items.push({ id: ++floatId, kind: 'level', x, y: y - 36, text: `⬆️ Suchen Lv ${r.levelUp}` });
    spawn(items);
    if (r.charm) onCharm(r.charm);
  };

  const sk = state.skills;

  return (
    <div>
      <GoalBanner state={state} onMove={onMove} />

      <div
        ref={floorRef}
        className="mg-floor"
        onPointerDown={handleClick}
        style={{ background: `linear-gradient(160deg, ${loc.floor[0]}, ${loc.floor[1]})` }}
      >
        <div className="mg-floor-pattern" />
        {deco.map((d, i) => (
          <div key={i} className="mg-floor-deco" style={{ left: `${d.x}%`, top: `${d.y}%`, transform: `rotate(${d.r}deg)` }}>{d.e}</div>
        ))}
        <div className="mg-floor-vignette" />
        <div className="mg-floor-loc">{loc.icon} {loc.name}</div>
        {derived.autoSearches > 0 && <div className="mg-floor-auto">🤖 {fmt(derived.autoSearches, 1)} Suchen/s</div>}
        <div className="mg-floor-hint">
          <div className="glass">🔍</div>
          <div className="txt">{state.stats.clicks < 5 ? 'Klick auf den Boden, um zu suchen!' : 'Weitersuchen…'}</div>
          {state.stats.clicks < 30 && <div className="sub">Irgendwo hier liegen verlorene Chips</div>}
        </div>
        {floats.map(f => f.kind === 'chip' ? (
          <div key={f.id} className="mg-chip" style={{ left: f.x - 9, top: f.y - 9, '--dx': `${f.dx}px`, '--dy': `${f.dy}px`, '--rot': `${f.rot}deg` }}>{f.text}</div>
        ) : (
          <div key={f.id} className={`mg-float ${f.kind}`} style={{ left: f.x, top: f.y }}>{f.text}</div>
        ))}
      </div>

      <div className="mg-statrow">
        <div className="mg-stat"><div className="k">🎯 Fundchance</div><div className="v">{(derived.chance * 100).toFixed(derived.chance < 0.1 ? 1 : 0).replace('.', ',')}%</div></div>
        <div className="mg-stat"><div className="k">🪙 Wert pro Fund</div><div className="v">{fmtMoney(derived.value)}</div></div>
        <div className="mg-stat"><div className="k">👆 Suchen pro Klick</div><div className="v">{fmt(derived.clickSearches + derived.clickPct * derived.autoSearches, 0)}</div></div>
        <div className="mg-stat"><div className="k">💸 Pro Klick (Ø)</div><div className="v" style={{ color: 'var(--green)' }}>{fmtMoney(derived.clickEV)}</div></div>
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
