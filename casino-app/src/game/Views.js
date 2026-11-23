import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { LOCATIONS, CHARMS, TOOLS, HELPERS, ACHIEVEMENTS, ACHIEVEMENT_BONUS, WHEEL_PRIZES, vipCost, vipName, vipTierIndex, vipLimit, vipAffordable, jackpotPool, jackpotChance, coinById, fmt, fmtMoney, fmtTime } from './economy';
import { sfx } from './sound';
import { SLOT_THEMES } from './slotThemes';

export const GAME_INFO = {
  dice:      { name: 'Dice',      icon: '🎲', desc: 'Roll über oder unter', bg: 'linear-gradient(160deg, #3b82f6, #1e3a8a)' },
  mines:     { name: 'Mines',     icon: '💣', desc: 'Vermeide die Minen', bg: 'linear-gradient(160deg, #ef4444, #7f1d1d)' },
  plinko:    { name: 'Plinko',    icon: '🎯', desc: 'Lass den Ball fallen', bg: 'linear-gradient(160deg, #a855f7, #4c1d95)' },
  crash:     { name: 'Crash',     icon: '🚀', desc: 'Cash out vor dem Crash', bg: 'linear-gradient(160deg, #f97316, #7c2d12)', tag: 'hot' },
  roulette:  { name: 'Roulette',  icon: '🎡', desc: 'Rot, Schwarz oder Zahl', bg: 'linear-gradient(160deg, #16a34a, #14532d)' },
  blackjack: { name: 'Blackjack', icon: '🃏', desc: 'Schlag den Dealer', bg: 'linear-gradient(160deg, #eab308, #713f12)', tag: 'neu' },
  chicken:   { name: 'Chicken',   icon: '🐔', desc: 'Über die Straße', bg: 'linear-gradient(160deg, #84cc16, #365314)' },
  pump:      { name: 'Pump',      icon: '🎈', desc: 'Pump bis es knallt', bg: 'linear-gradient(160deg, #06b6d4, #164e63)' },
};
// Ein Automat pro Ort (vorne), danach die Tischspiele
LOCATIONS.slice().reverse().forEach(l => {
  const t = SLOT_THEMES[l.id];
  GAME_INFO[`slots-${l.id}`] = { name: t.name, icon: t.icon, desc: `Automat · ${t.scatter}×3 = Freispiele`, bg: `linear-gradient(160deg, ${t.c1}, ${t.c2})`, slot: l.id };
});
const ALL_GAMES = [...LOCATIONS.map(l => `slots-${l.id}`), ...Object.keys(GAME_INFO).filter(g => !g.startsWith('slots-'))];
export const coinRange = (loc) => {
  const a = coinById(loc.coins[0]); const b = coinById(loc.coins[3]);
  return `${a.label} ${a.unit} – ${b.label} ${b.unit}`;
};

// ─── Orte ──────────────────────────────────────────────────────────────────
export function LocationsView({ state, onMove }) {
  return (
    <div className="mg-journey">
      <div className="mg-label" style={{ textAlign: 'center', marginBottom: 20 }}>Deine Reise zum Casino-Mogul</div>
      {LOCATIONS.map((l, i) => {
        const status = i < state.location ? 'done' : i === state.location ? 'current' : 'future';
        const isNext = i === state.location + 1;
        const can = isNext && state.money >= l.cost;
        const newTools = TOOLS.filter(t => t.loc === i);
        const newHelpers = HELPERS.filter(h => h.loc === i);
        const newGames = l.games;
        const hidden = i > state.location + 1;
        return (
          <div key={l.id} className={`mg-stop ${status}`}>
            <div className="line">
              <div className="dot">{hidden ? '❓' : l.icon}</div>
              {i < LOCATIONS.length - 1 && <div className="seg" />}
            </div>
            <div className="mg-panel card" style={status === 'current' ? { borderColor: '#fbbf2466' } : undefined}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 17 }}>
                    {hidden ? '???' : l.name}
                    {status === 'current' && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--gold)' }}>📍 DU BIST HIER</span>}
                    {status === 'done' && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--green)' }}>✓</span>}
                  </div>
                  {!hidden && <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>{l.desc}</div>}
                </div>
                {status === 'future' && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: can ? 'var(--green)' : 'var(--text)' }}>{fmtMoney(l.cost)}</div>
                    {isNext && <button className={can ? 'mg-btn green' : 'mg-btn-ghost'} disabled={!can} onClick={onMove} style={{ marginTop: 6, padding: '8px 14px', fontSize: 13 }}>
                      {can ? 'Umziehen →' : `noch ${fmtMoney(l.cost - state.money)}`}
                    </button>}
                  </div>
                )}
              </div>
              {!hidden && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, fontSize: 12 }}>
                  <span className="mg-lvl" style={{ color: 'var(--gold)', borderColor: '#fbbf2444', background: '#fbbf241a' }}>🪙 {coinRange(l)}</span>
                  {newGames.map(g => <span key={g} className="mg-lvl" style={{ color: 'var(--blue)', borderColor: '#60a5fa44', background: '#60a5fa1a' }}>{GAME_INFO[g].icon} {GAME_INFO[g].name}</span>)}
                  {newHelpers.map(h => <span key={h.id} className="mg-lvl">{h.icon} {status === 'future' ? 'Neuer Helfer' : h.name}</span>)}
                  {newTools.length > 0 && <span className="mg-lvl" style={{ color: 'var(--muted)', borderColor: 'var(--border)', background: 'transparent' }}>🛠️ {newTools.length} Werkzeuge</span>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Casino ────────────────────────────────────────────────────────────────
const FAKE_NAMES = ['Kevin', 'Chantal', 'Dieter', 'Mandy', 'Jürgen', 'LuckyLuke', 'Zockerkönig', 'Svenja', 'Ronny', 'BigBoss', 'Heike', 'Marvin', 'Jackpot-Jens', 'Uschi', 'Dennis', 'Chiara'];

function LiveFeed({ maxBet, games }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    const add = () => {
      const g = games[Math.floor(Math.random() * games.length)];
      const big = Math.random() < 0.12;
      const mult = big ? 10 + Math.random() * 90 : 1.2 + Math.random() * 4;
      const amount = maxBet * (0.05 + Math.random() * 0.6) * mult;
      setRows(r => [{ id: Math.random(), name: FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)], g, amount, big, mult }, ...r].slice(0, 6));
    };
    add(); add(); add();
    // neue Meldung alle 6–12 Sekunden (zufällig, wirkt natürlicher)
    let t;
    const next = () => { t = setTimeout(() => { add(); next(); }, 6000 + Math.random() * 6000); };
    next();
    return () => clearTimeout(t);
  }, [maxBet, games]);
  return (
    <div className="cs-feed">
      {rows.map(r => (
        <div key={r.id} className={`cs-feed-row${r.big ? ' big' : ''}`}>
          <span>{GAME_INFO[r.g].icon}</span>
          <span><b style={{ color: 'var(--text)', marginLeft: 0 }}>{r.name}</b> · {GAME_INFO[r.g].name}{r.big ? ` · ×${r.mult.toFixed(0)}` : ''}</span>
          <b>+{fmtMoney(r.amount)}</b>
        </div>
      ))}
    </div>
  );
}

export function Wheel({ state, onSpin, hl }) {
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState('');
  const [now, setNow] = useState(Date.now());
  const rotRef = useRef(0);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const seg = 360 / WHEEL_PRIZES.length;
  const ready = (state.wheelReadyAt || 0) <= now;
  const bg = `conic-gradient(${WHEEL_PRIZES.map((p, i) => `${p.color} ${i * seg}deg ${(i + 1) * seg}deg`).join(', ')})`;

  const spin = () => {
    if (!ready || spinning) return;
    const out = onSpin();
    if (!out) return;
    setSpinning(true); setResult('');
    const target = rotRef.current + 360 * 5 + (360 - ((out.index + 0.5) * seg) - (rotRef.current % 360));
    rotRef.current = target;
    setRot(target);
    let ticks = 0;
    const t = setInterval(() => { sfx.tick(); if (++ticks > 30) clearInterval(t); }, 110);
    setTimeout(() => {
      setSpinning(false);
      setResult(`${out.prize.icon} ${out.text}`);
      if (out.prize.id === 'jackpot' || out.prize.id === 'big') sfx.bigWin(); else sfx.win();
    }, 4200);
  };

  const left = Math.max(0, (state.wheelReadyAt || 0) - now) / 1000;
  return (
    <div className="cs-wheel-box">
      <div className="cs-wheel">
        <div className="pointer" />
        <div className="disc" style={{ background: bg, transform: `rotate(${rot}deg)`, transition: spinning ? 'transform 4s cubic-bezier(.12,.8,.2,1)' : 'none' }}>
          {WHEEL_PRIZES.map((p, i) => (
            <div key={p.id} className="seg" style={{ transform: `rotate(${(i + 0.5) * seg}deg)` }}><span>{p.icon}</span></div>
          ))}
        </div>
        <div className="hub">🎩</div>
      </div>
      <div className="cs-wheel-result">{result || (ready ? 'Gratis-Dreh bereit!' : `Nächster Dreh in ${fmtTime(left)}`)}</div>
      <button data-tut="wheel" className={`mg-btn pink${hl ? ' mg-hl' : ''}`} disabled={!ready || spinning} onClick={spin}>{spinning ? 'Dreht…' : ready ? '🎡 Gratis drehen!' : '⏳ Warten'}</button>
    </div>
  );
}

export function VipCard({ state, derived, onBuy, compact }) {
  const lvl = state.vip || 0;
  const cost = vipCost(state);
  const can = state.money >= cost;
  const many = vipAffordable(state);
  const tier = vipTierIndex(lvl);
  return (
    <div className="cs-vip" data-lvl={Math.min(tier, 6)}>
      <div className="card">
        <div className="tier">🎫 VIP · {vipName(lvl)}</div>
        <div style={{ fontSize: 11, fontWeight: 900, opacity: .8 }}>Stufe {lvl}</div>
      </div>
      <div style={{ flex: 1, minWidth: 150 }}>
        <div style={{ fontWeight: 900 }}>Max-Einsatz {fmtMoney(derived.maxBet)}</div>
        <div style={{ color: 'var(--muted)', fontSize: 12 }}>
          {compact ? <>Nächste Stufe: {fmtMoney(vipLimit(lvl + 1))}</> : <>Steigt nur durch Kaufen. Jede Stufe verdoppelt dein Limit (nächste: {fmtMoney(vipLimit(lvl + 1))}).</>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className={can ? 'mg-btn' : 'mg-btn-ghost'} disabled={!can} onClick={() => onBuy(1)} style={{ whiteSpace: 'nowrap', padding: '10px 14px', fontSize: 15 }}>
          ⬆️ +1 Stufe · {fmtMoney(cost)}
        </button>
        {many > 1 && (
          <button className="mg-btn green" onClick={() => onBuy(many)} style={{ whiteSpace: 'nowrap', padding: '10px 14px', fontSize: 15 }}>
            ⏫ Max (+{many})
          </button>
        )}
      </div>
    </div>
  );
}

export function CasinoView({ state, derived, onPick, onSpin, onBuyVip, hl = '', jackpot, showExtras = true }) {
  const firstLoc = (g) => LOCATIONS.findIndex(l => l.games.includes(g));
  const jp = jackpot ? jackpot.pool : jackpotPool(state);
  const online = jackpot && jackpot.online;
  const oneIn = Math.round(1 / jackpotChance(state, derived.maxBet));

  return (
    <div>
      <div className={`cs-hero${showExtras ? '' : ' solo'}`}>
        <div className="cs-sign">
          <div className="bulbs" />
          <h1>CASINO</h1>
          <div className="sub">Verdopple dein Geld – oder verlier alles. Jede Runde gibt Zocken-XP.</div>
          <div className="cs-jackpot"><span className="lbl">💰 JACKPOT</span><span className="val">{fmtMoney(jp)}</span></div>
          <div className="cs-jp-info">
            {online ? <><b style={{ color: '#fff' }}>Ein Topf für alle Spieler!</b> </> : null}
            Jede Wette füllt den Topf (2 % vom Einsatz). Jede Runde in jedem Spiel kann ihn knacken – mit vollem Max-Einsatz
            1 : {oneIn.toLocaleString('de-DE')}, mit weniger Einsatz seltener. <b>Das Top-Symbol 3× am Automaten knackt ihn immer!</b>
            {online && <> Auszahlung bis zum 500-Fachen deines Max-Einsatzes, der Rest bleibt im Topf.</>}
          </div>
          {showExtras && <VipCard state={state} derived={derived} onBuy={onBuyVip} />}
          <div className="cs-chips">
            <div className="mg-stat"><div className="k">Gewinnbonus</div><div className="v" style={{ color: 'var(--green)' }}>+{(derived.winBonus * 100).toFixed(1)}%</div></div>
            {state.stats.bets > 0 && <div className="mg-stat"><div className="k">Bilanz</div><div className="v" style={{ color: state.stats.gambleProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>{state.stats.gambleProfit >= 0 ? '+' : '−'}{fmtMoney(Math.abs(state.stats.gambleProfit))}</div></div>}
          </div>
        </div>
        {showExtras && (
          <div className="mg-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="mg-label" style={{ marginBottom: 0 }}>🎡 Glücksrad · alle 8 Minuten gratis</div>
            <Wheel state={state} onSpin={onSpin} hl={hl === 'wheel'} />
          </div>
        )}
      </div>

      <div className="mg-label">🎮 Spiele</div>
      <div className="cs-games">
        {ALL_GAMES.map(g => {
          const unlocked = derived.games.includes(g);
          const info = GAME_INFO[g];
          const l = LOCATIONS[firstLoc(g)];
          return (
            <button key={g} data-tut={`game-${g}`} className={`cs-game${hl === `game-${g}` ? ' mg-hl' : ''}`} disabled={!unlocked} onClick={() => onPick(g)}>
              {unlocked && info.tag && <span className={`tag ${info.tag}`}>{info.tag === 'hot' ? '🔥 HOT' : '✨ NEU'}</span>}
              <div className="art" style={{ background: info.bg }}>{unlocked ? info.icon : '🔒'}</div>
              <div className="info">
                <div className="nm">{info.name}</div>
                <div className="ds">{unlocked ? info.desc : `ab ${l.icon} ${l.name}`}</div>
              </div>
            </button>
          );
        })}
      </div>

      {online && jackpot.wins && jackpot.wins.length > 0 && (
        <div className="mg-panel" style={{ marginTop: 18 }}>
          <div className="mg-label">💰 Letzte Jackpot-Gewinner</div>
          <div className="cs-feed">
            {jackpot.wins.slice(0, 5).map(w => (
              <div key={w.id} className="cs-feed-row big">
                <span>🎉</span>
                <span><b style={{ color: 'var(--text)', marginLeft: 0 }}>{w.username}</b> · {GAME_INFO[w.game]?.name || w.game}</span>
                <b>+{fmtMoney(w.amount)}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mg-panel" style={{ marginTop: 18 }}>
        <div className="mg-label">📡 Live-Gewinne</div>
        <LiveFeed maxBet={Math.max(derived.maxBet, 1)} games={derived.games} />
      </div>
    </div>
  );
}

// ─── Sammlung ──────────────────────────────────────────────────────────────
export function CollectionView({ state }) {
  const total = CHARMS.reduce((a, c) => a + c.max, 0);
  const have = CHARMS.reduce((a, c) => a + (state.charms[c.id] || 0), 0);
  const got = state.achievements || [];
  return (
    <div>
      <div className="mg-panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <div className="disp" style={{ fontSize: 22 }}>🏆 Erfolge · {got.length}/{ACHIEVEMENTS.length}</div>
          <span className="mg-lvl" style={{ color: 'var(--gold)', borderColor: '#ffc83d66', background: '#ffc83d1a', fontSize: 13 }}>Bonus: +{Math.round(got.length * ACHIEVEMENT_BONUS * 100)}% auf alles</span>
        </div>
        <div className="mg-ach">
          {ACHIEVEMENTS.map(a => {
            const ok = got.includes(a.id);
            return (
              <div key={a.id} className={`mg-ach-item ${ok ? 'got' : 'locked'}`}>
                <div className="ic">{a.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>{a.name}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>{a.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mg-panel" style={{ marginBottom: 16 }}>
        <div className="disp" style={{ fontSize: 22 }}>🍀 Glücksbringer · {have}/{total}</div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
          Tauchen ganz selten zwischen den Münzen auf dem Boden auf – und sind nach 4 Sekunden wieder weg. Schnell klicken! Jeder Glücksbringer wirkt dauerhaft. Die Diamant-Nadel ist die Nadel im Heuhaufen.
        </div>
      </div>
      <div className="mg-charms">
        {CHARMS.map(c => {
          const n = state.charms[c.id] || 0;
          return (
            <div key={c.id} className={`mg-charm ${n === 0 ? 'none' : ''}`}>
              <div className="ic">{c.icon}</div>
              <div style={{ fontWeight: 800, marginTop: 6 }}>{n > 0 ? c.name : '???'}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>{c.desc} je Stück</div>
              <div style={{ color: 'var(--dim)', fontSize: 11, marginTop: 4 }}>Chance: 1 : {c.odds.toLocaleString('de-DE')} pro Münze</div>
              <div className="pips">{Array.from({ length: c.max }, (_, i) => <span key={i} className={i < n ? 'on' : ''} />)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Rangliste ─────────────────────────────────────────────────────────────
export function LeaderboardView({ user }) {
  const [by, setBy] = useState('money');
  const [data, setData] = useState(null);
  useEffect(() => {
    setData(null);
    api.mogulLeaderboard(by).then(setData).catch(() => setData({ top: [], me: null }));
  }, [by]);
  const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`);
  const comboBadge = (n) => (n > 0 ? <span className="mg-lvl" title="Beste Combo" style={{ color: '#ffb36b', borderColor: '#ff8a3d66', background: '#ff8a3d1a' }}>🔥 ×{fmt(n, 0)}</span> : null);
  const value = (r) => (by === 'combo'
    ? <b className="disp" style={{ color: '#ffb36b', fontSize: 20, fontWeight: 400 }}>🔥 ×{fmt(r.max_combo, 0)}</b>
    : <b style={{ color: 'var(--green)' }}>{fmtMoney(r.earned)}</b>);
  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="mg-shop-tabs" style={{ marginBottom: 14 }}>
        <button className={`mg-shop-tab ${by === 'money' ? 'active' : ''}`} onClick={() => setBy('money')}>💰 Vermögen</button>
        <button className={`mg-shop-tab ${by === 'combo' ? 'active' : ''}`} onClick={() => setBy('combo')}>🔥 Combo-Rekord</button>
      </div>
      <div className="mg-label">{by === 'combo' ? 'Wer hat die meisten Münzen am Stück erwischt?' : 'Sortiert nach Ort, dann Gesamt verdient'}</div>
      {!data && <div style={{ color: 'var(--muted)' }}>Lade…</div>}
      {data && data.me && !data.top.some(r => r.username === data.me.username) && (
        <div className="mg-rank me">
          <span style={{ width: 36, textAlign: 'center', fontWeight: 800 }}>#{data.me.rank}</span>
          <div style={{ flex: 1, fontWeight: 700 }}>{data.me.username} (du)</div>
          {by === 'money' && <span>{LOCATIONS[data.me.location]?.icon}</span>}
          {by === 'money' && comboBadge(data.me.max_combo)}
          {value(data.me)}
        </div>
      )}
      {data && (data.top || []).map((r, i) => (
        <div key={r.username} className={`mg-rank ${r.username === user.username ? 'me' : ''}`} style={by === 'combo' && i === 0 ? { borderColor: '#ff8a3d', boxShadow: '0 4px 0 var(--shadow), 0 0 24px rgba(255,138,61,.35)' } : undefined}>
          <span style={{ width: 36, textAlign: 'center', fontSize: 18, fontWeight: 800 }}>{medal(i)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{r.username}{r.username === user.username && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> (du)</span>}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>{LOCATIONS[r.location]?.icon} {LOCATIONS[r.location]?.name}</div>
          </div>
          {by === 'money' && comboBadge(r.max_combo)}
          {value(r)}
        </div>
      ))}
      {data && data.top?.length === 0 && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>Noch niemand da – sei der Erste!</div>}
    </div>
  );
}

// ─── Statistik & Konto ─────────────────────────────────────────────────────
export function StatsView({ state, onReset }) {
  const [newUsername, setNewUsername] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const st = state.stats;
  const rows = [
    ['💰 Gesamt verdient', fmtMoney(st.totalEarned)],
    ['⏱️ Spielzeit', fmtTime(st.playTime)],
    ['🪙 Münzen aufgehoben', fmt(st.finds, 0)],
    ['🥇 Goldmünzen', fmt(st.goldChips, 0)],
    ['🔥 Beste Combo', `×${fmt(st.maxCombo || 0, 0)}`],
    ['🎰 Casino-Runden', fmt(st.bets, 0)],
    ['📈 Casino-Bilanz', (st.gambleProfit >= 0 ? '+' : '−') + fmtMoney(Math.abs(st.gambleProfit))],
  ];
  const input = { width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, marginBottom: 8 };
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
      <div className="mg-panel">
        <div className="mg-label">Statistik</div>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
            <span style={{ color: 'var(--muted)' }}>{k}</span><b>{v}</b>
          </div>
        ))}
      </div>
      <div className="mg-panel">
        <div className="mg-label">Konto</div>
        {msg && <div style={{ marginBottom: 10, fontSize: 13 }}>{msg}</div>}
        <input style={input} placeholder="Neuer Benutzername" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
        <button className="mg-btn" style={{ width: '100%', marginBottom: 16 }} onClick={async () => {
          if (!newUsername) return;
          const r = await api.changeUsername(newUsername);
          if (r.error) flash('❌ ' + r.error);
          else { flash('✅ Geändert! Bitte neu einloggen.'); setTimeout(() => { localStorage.removeItem('token'); window.location.reload(); }, 1500); }
        }}>Namen ändern</button>
        <input style={input} type="password" placeholder="Altes Passwort" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
        <input style={input} type="password" placeholder="Neues Passwort" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
        <button className="mg-btn" style={{ width: '100%', marginBottom: 24 }} onClick={async () => {
          if (!oldPassword || !newPassword) return;
          const r = await api.changePassword(oldPassword, newPassword);
          if (r.error) flash('❌ ' + r.error); else { flash('✅ Passwort geändert!'); setOldPassword(''); setNewPassword(''); }
        }}>Passwort ändern</button>
        <div className="mg-label">Gefahrenzone</div>
        {confirmReset ? (
          <div>
            <div style={{ fontSize: 13, marginBottom: 8 }}>Wirklich alles löschen? Das kann nicht rückgängig gemacht werden.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="mg-btn red" style={{ flex: 1, background: 'var(--red)', color: '#1a0505' }} onClick={() => { setConfirmReset(false); onReset(); }}>Ja, löschen</button>
              <button className="mg-btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmReset(false)}>Abbrechen</button>
            </div>
          </div>
        ) : (
          <button className="mg-btn red" style={{ width: '100%' }} onClick={() => setConfirmReset(true)}>🗑️ Spielstand zurücksetzen</button>
        )}
      </div>
    </div>
  );
}
