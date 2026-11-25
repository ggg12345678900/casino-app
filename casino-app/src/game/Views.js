import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { LOCATIONS, CHARMS, TOOLS, HELPERS, ACHIEVEMENTS, ACHIEVEMENT_BONUS, WHEEL_PRIZES, vipCost, vipName, vipTierIndex, vipLimit, vipAffordable, jackpotPool, jackpotChance, coinById, fmt, fmtMoney, fmtTime, JETON_ITEMS, jetonItemLevel, jetonItemCost, jetonsOn, ALBUM, ALBUM_TOTAL, albumPieces, albumSets, ALBUM_SET_BONUS, ALBUM_CHANCE, TIERS, AVATARS, TITLES, avatarUnlocked, titleUnlocked, avatarIcon, titleName, achievementName, CHIP_SKINS, FLOOR_SKINS } from './economy';
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
  highroller: { name: 'High Roller', icon: '💎', desc: 'Nur mit Jetons 🟣', bg: 'linear-gradient(160deg, #7c3aed, #1a0536)', jeton: true },
};
// Ein Automat pro Ort (vorne), danach die Tischspiele
LOCATIONS.slice().reverse().forEach(l => {
  const t = SLOT_THEMES[l.id];
  GAME_INFO[`slots-${l.id}`] = { name: t.name, icon: t.icon, desc: `Automat · ${t.scatter}×3 = Freispiele`, bg: `linear-gradient(160deg, ${t.c1}, ${t.c2})`, slot: l.id };
});
const ALL_GAMES = [...LOCATIONS.map(l => `slots-${l.id}`), ...Object.keys(GAME_INFO).filter(g => !g.startsWith('slots-') && g !== 'highroller')];
export const fmtJetons = (n) => `${fmt(Math.floor(n + 1e-9), 0)} 🟣`;

// ─── Jeton-Shop ────────────────────────────────────────────────────────────
export function JetonShop({ state, onBuy, onBuySkin }) {
  const now = Date.now();
  const j = state.jetons || 0;
  const slotName = SLOT_THEMES[LOCATIONS[state.location].id].name;
  return (
    <div className="mg-panel cs-jshop">
      <div className="cs-jshop-head">
        <div>
          <div className="mg-label" style={{ marginBottom: 2 }}>🟣 Jeton-Shop</div>
          <div className="cs-jshop-sub">Jetons gibt's fürs Antippen (Jeton-Leiste), für große Gewinne, den Jackpot und am Glücksrad. Mehr Möglichkeiten im 🌳 Skilltree.</div>
        </div>
        <div className="cs-jbal">{fmtJetons(j)}</div>
      </div>
      <div className="cs-jitems">
        {JETON_ITEMS.map(it => {
          const lvl = jetonItemLevel(state, it);
          const maxed = it.max && lvl >= it.max;
          const cost = jetonItemCost(state, it, lvl);
          const block = it.blocked ? it.blocked(state, now) : null;
          const can = !maxed && !block && j >= cost;
          return (
            <button key={it.id} data-tut={`jitem-${it.id}`} className={`cs-jitem${can ? ' can' : ''}${maxed ? ' maxed' : ''}`} disabled={!can} onClick={() => onBuy(it.id)}>
              <div className="ic">{it.icon}</div>
              <div className="body">
                <div className="nm">{it.name}{it.max > 1 && <span className="lv">{lvl}/{it.max}</span>}</div>
                <div className="ds">{it.perSlot ? `${slotName}: ` : ''}{it.desc}</div>
                {it.id === 'freepack' && (state.bonusSpins || 0) > 0 && <div className="ds" style={{ color: 'var(--green)' }}>Du hast {state.bonusSpins} Gratis-Spins – starte sie am Automaten</div>}
              </div>
              <div className="pr">{maxed ? '✔' : block ? '–' : fmtJetons(cost)}</div>
            </button>
          );
        })}
      </div>
      {onBuySkin && <SkinShop state={state} onBuy={onBuySkin} />}
    </div>
  );
}

function SkinShop({ state, onBuy }) {
  const c = state.cosmetics || { owned: [] };
  const row = (kind, list, label) => (
    <>
      <div className="mg-label" style={{ marginTop: 14 }}>{label}</div>
      <div className="cs-skins">
        {list.map(sk => {
          const owned = sk.cost === 0 || (c.owned || []).includes(`${kind}:${sk.id}`);
          const active = (c[kind] || (kind === 'chip' ? 'classic' : 'default')) === sk.id;
          const can = owned || (state.jetons || 0) >= sk.cost;
          return (
            <button key={sk.id} className={`cs-skin ${kind}-prev-${sk.id}${active ? ' on' : ''}`} disabled={!can && !active} onClick={() => onBuy(kind, sk.id)}>
              <div className="sw">{sk.icon}</div>
              <div className="nm">{sk.name}</div>
              <div className="pr">{active ? '✔ aktiv' : owned ? 'Anlegen' : fmtJetons(sk.cost)}</div>
            </button>
          );
        })}
      </div>
    </>
  );
  return (
    <div className="cs-skinshop">
      {row('chip', CHIP_SKINS, '🎨 Chip-Skins')}
      {row('floor', FLOOR_SKINS, '🖼️ Spielfeld-Designs')}
    </div>
  );
}
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

const ONLINE_FEED = process.env.REACT_APP_DEMO !== 'true';
const agoShort = (t) => {
  const sec = Math.max(0, (Date.now() - new Date(t).getTime()) / 1000);
  if (sec < 60) return 'gerade';
  if (sec < 3600) return `${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} h`;
  return `${Math.floor(sec / 86400)} T`;
};
// Live-Gewinne: online die echten Gewinne aller Spieler, in der Demo erfundene Beispiele
function LiveFeed({ maxBet, games, me }) {
  const [rows, setRows] = useState(ONLINE_FEED ? null : []);
  useEffect(() => {
    if (!ONLINE_FEED) return undefined;
    let stop = false;
    const load = () => api.liveWins().then(r => { if (!stop && Array.isArray(r)) setRows(r); }).catch(() => {});
    load();
    const id = setInterval(load, 8000);
    return () => { stop = true; clearInterval(id); };
  }, []);
  useEffect(() => {
    if (ONLINE_FEED) return undefined;
    const add = () => {
      const g = games[Math.floor(Math.random() * games.length)];
      const big = Math.random() < 0.12;
      const mult = big ? 10 + Math.random() * 90 : 2 + Math.random() * 4;
      const amount = maxBet * (0.05 + Math.random() * 0.6) * mult;
      setRows(r => [{ id: Math.random(), username: FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)], game: g, amount, mult }, ...r].slice(0, 6));
    };
    add(); add(); add();
    let t;
    const next = () => { t = setTimeout(() => { add(); next(); }, 6000 + Math.random() * 6000); };
    next();
    return () => clearTimeout(t);
  }, [maxBet, games]);
  if (!ONLINE_FEED) return <div className="cs-feed"><div className="ad-muted" style={{ padding: 8 }}>📡 Live-Gewinne gibt es nur in der Online-Version – hier spielst du offline.</div></div>;
  if (rows === null) return <div className="cs-feed"><div className="ad-muted">Lade…</div></div>;
  if (rows.length === 0) return <div className="cs-feed"><div className="ad-muted" style={{ padding: 8 }}>Noch keine Gewinne – hol dir den ersten Platz im Feed! 🎰</div></div>;
  return (
    <div className="cs-feed">
      {rows.slice(0, 8).map(r => {
        const info = GAME_INFO[r.game] || { icon: '🎰', name: r.game };
        const big = r.mult >= 10;
        return (
          <div key={r.id} className={`cs-feed-row${big ? ' big' : ''}${me && r.username === me ? ' me' : ''}`}>
            <span>{info.icon}</span>
            <span>{r.avatar && <span className="mg-av-s">{avatarIcon(r.avatar)}</span>}<b style={{ color: 'var(--text)', marginLeft: 0 }}>{r.username}</b>{r.title && titleName(r.title) && <span className="mg-title-badge s">{titleName(r.title)}</span>} · {info.name} · ×{fmt(r.mult, r.mult < 10 ? 1 : 0)}
              {r.created_at && <span className="ago"> · {agoShort(r.created_at)}</span>}</span>
            <b>+{fmtMoney(r.amount)}</b>
          </div>
        );
      })}
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
  const prizes = jetonsOn(state) ? WHEEL_PRIZES : WHEEL_PRIZES.map(p => (p.id === 'jetons' ? { ...p, label: '2 Min', icon: '💶', color: '#16a34a' } : p));
  const seg = 360 / prizes.length;
  const ready = (state.wheelReadyAt || 0) <= now;
  const bg = `conic-gradient(${prizes.map((p, i) => `${p.color} ${i * seg}deg ${(i + 1) * seg}deg`).join(', ')})`;

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
          {prizes.map((p, i) => (
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

export function CasinoView({ state, derived, onPick, onSpin, onBuyVip, onOpenJetons, hl = '', jackpot, showExtras = true, me }) {
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
        {(state.jetonShop || {}).highroller > 0 && (
          <button data-tut="game-highroller" className="cs-game highroller" onClick={() => onPick('highroller')}>
            <span className="tag neu">💎 VIP</span>
            <div className="art" style={{ background: GAME_INFO.highroller.bg }}>💎</div>
            <div className="info"><div className="nm">High Roller</div><div className="ds">Nur mit Jetons · Jackpot {fmtJetons(state.jetonPot || 100)}</div></div>
          </button>
        )}
        {ALL_GAMES.filter(g => !(g.startsWith('slots-') && firstLoc(g) < state.location)).map(g => {
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

      {onOpenJetons && (
        <button className="cs-jlink" onClick={onOpenJetons}>
          <span className="ic">🟣</span>
          <span className="tx"><b>Jeton-Shop & Skilltree</b><small>Gratis-Spins, Glückssträhne, High Roller – und 100 Skills</small></span>
          <span className="bal">{fmtJetons(state.jetons || 0)}</span>
        </button>
      )}

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
        <LiveFeed maxBet={Math.max(derived.maxBet, 1)} games={derived.games} me={me} />
      </div>
    </div>
  );
}

// ─── Sammlung ──────────────────────────────────────────────────────────────
// Münz-Sammelalbum
function AlbumPanel({ state }) {
  const album = state.album || {};
  return (
    <div className="mg-panel mg-album" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div className="disp" style={{ fontSize: 22 }}>📖 Sammelalbum · {albumPieces(state)}/{ALBUM_TOTAL}</div>
        <span className="mg-lvl" style={{ color: 'var(--gold)', borderColor: '#ffc83d66', background: '#ffc83d1a', fontSize: 13 }}>Sets: {albumSets(state)} · +{Math.round(albumSets(state) * ALBUM_SET_BONUS * 100)}% Münzwert</span>
      </div>
      <div style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 12px' }}>
        Seltene Münzen findest du nur beim Antippen (ca. 1 : {Math.round(1 / ALBUM_CHANCE)}) – und nur die Münzen des Orts, an dem du gerade bist.
        Jedes volle Set: dauerhaft +{Math.round(ALBUM_SET_BONUS * 100)} % Münzwert. Doppelte werden zu Jetons.
      </div>
      <div className="mg-album-sets">
        {LOCATIONS.map((l, li) => {
          const set = ALBUM[l.id] || [];
          const done = set.every(([id]) => (album[id] || 0) > 0);
          const reached = li <= state.location;
          return (
            <div key={l.id} className={`mg-album-set${done ? ' done' : ''}${reached ? '' : ' far'}`}>
              <div className="hd">{reached ? `${l.icon} ${l.name}` : '🔒 ???'}{done && ' ✅'}</div>
              <div className="pcs">
                {set.map(([id, icon, name]) => {
                  const n = album[id] || 0;
                  return (
                    <div key={id} className={`pc${n ? ' got' : ''}`} title={n ? name : '???'}>
                      <span>{n ? icon : '?'}</span>
                      {n > 1 && <b>×{n}</b>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Profil: Avatar und Titel (erscheinen in Rangliste und Live-Feed)
function ProfilePanel({ state, user, onProfile }) {
  const pr = state.profile || {};
  return (
    <div className="mg-panel mg-profile" style={{ marginBottom: 16 }}>
      <div className="mg-profile-head">
        <div className="av">{avatarIcon(pr.avatar)}</div>
        <div>
          <div className="disp" style={{ fontSize: 22 }}>{user ? user.username : 'Du'}</div>
          {pr.title ? <span className="mg-title-badge">{titleName(pr.title)}</span> : <span className="ad-muted">Noch kein Titel gewählt</span>}
        </div>
      </div>
      <div className="mg-label" style={{ marginTop: 12 }}>Avatar · freigeschaltet über Erfolge</div>
      <div className="mg-avatars">
        {AVATARS.map(a => {
          const ok = avatarUnlocked(state, a);
          return (
            <button key={a.id} className={`mg-avatar${pr.avatar === a.id ? ' on' : ''}${ok ? '' : ' locked'}`} disabled={!ok}
              title={ok ? a.name : `🔒 ${achievementName(a.req)}`} onClick={() => onProfile && onProfile({ avatar: a.id })}>
              <span>{ok ? a.icon : '🔒'}</span>
            </button>
          );
        })}
      </div>
      <div className="mg-label" style={{ marginTop: 12 }}>Titel</div>
      <div className="mg-titles">
        <button className={`mg-titlechip${!pr.title ? ' on' : ''}`} onClick={() => onProfile && onProfile({ title: '' })}>Keiner</button>
        {TITLES.map(t => {
          const ok = titleUnlocked(state, t);
          return (
            <button key={t.id} className={`mg-titlechip${pr.title === t.id ? ' on' : ''}${ok ? '' : ' locked'}`} disabled={!ok}
              title={ok ? '' : `Freischalten: ${achievementName(t.req)}`} onClick={() => onProfile && onProfile({ title: t.id })}>
              {ok ? t.name : `🔒 ${achievementName(t.req)}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CollectionView({ state, user, onProfile }) {
  const total = CHARMS.reduce((a, c) => a + c.max, 0);
  const have = CHARMS.reduce((a, c) => a + (state.charms[c.id] || 0), 0);
  const got = state.achievements || [];
  return (
    <div>
      <ProfilePanel state={state} user={user} onProfile={onProfile} />
      <div className="mg-panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <div className="disp" style={{ fontSize: 22 }}>🏆 Erfolge · {got.length}/{ACHIEVEMENTS.length}</div>
          <span className="mg-lvl" style={{ color: 'var(--gold)', borderColor: '#ffc83d66', background: '#ffc83d1a', fontSize: 13 }}>Bonus: +{Math.round(got.length * ACHIEVEMENT_BONUS * 100)}% auf alles</span>
        </div>
        <div className="mg-tierbar">
          {TIERS.slice(1).map((t, i) => {
            const all = ACHIEVEMENTS.filter(a => a.tier === i + 1);
            return <span key={t} className={`mg-tier t${i + 1}`}>{t} {all.filter(a => got.includes(a.id)).length}/{all.length}</span>;
          })}
        </div>
        <div className="mg-ach">
          {[...ACHIEVEMENTS].sort((a, b) => (got.includes(b.id) - got.includes(a.id)) || (a.tier - b.tier)).map(a => {
            const ok = got.includes(a.id);
            return (
              <div key={a.id} className={`mg-ach-item ${ok ? 'got' : 'locked'} t${a.tier}`}>
                <div className="ic">{a.secret && !ok ? '❓' : a.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>{a.secret && !ok ? 'Geheimer Erfolg' : a.name} <span className={`mg-tier t${a.tier}`}>{TIERS[a.tier]}</span>{a.secret && <span className="mg-tier secret">🤫 geheim</span>}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>{a.secret && !ok ? 'Finde selbst heraus, wie man ihn bekommt …' : a.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <AlbumPanel state={state} />
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
  const value = (r) => {
    if (by === 'combo') return <b className="disp" style={{ color: '#ffb36b', fontSize: 20, fontWeight: 400 }}>🔥 ×{fmt(r.max_combo, 0)}</b>;
    if (by === 'bigwin') return <b style={{ color: 'var(--gold)' }}>{fmtMoney(r.value)}</b>;
    if (by === 'jackpots') return <b style={{ color: 'var(--gold)' }}>💰 {fmt(r.value, 0)}×</b>;
    if (by === 'jetons') return <b style={{ color: '#e9d5ff' }}>{fmt(r.value, 0)} 🟣</b>;
    if (by === 'album') return <b style={{ color: 'var(--gold)' }}>📖 {fmt(r.value, 0)}/{ALBUM_TOTAL}</b>;
    return <b style={{ color: 'var(--green)' }}>{fmtMoney(r.earned)}</b>;
  };
  const BOARDS = [['money', '💰 Vermögen', 'Sortiert nach Ort, dann Gesamt verdient'], ['combo', '🔥 Combo', 'Wer hat die meisten Münzen am Stück erwischt?'],
    ['bigwin', '🎆 Größter Gewinn', 'Der größte Einzelgewinn im Casino'], ['jackpots', '💰 Jackpots', 'Wer hat den Jackpot am öftesten geknackt?'],
    ['jetons', '🟣 Jetons', 'Insgesamt verdiente Jetons'], ['album', '📖 Album', 'Die meisten gefundenen Album-Stücke']];
  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="mg-lb-tabs">
        {BOARDS.map(([id, label]) => (
          <button key={id} className={by === id ? 'active' : ''} onClick={() => setBy(id)}>{label}</button>
        ))}
      </div>
      <div className="mg-label">{BOARDS.find(b => b[0] === by)[2]}</div>
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
            <div style={{ fontWeight: 700 }}><span className="mg-av-s">{avatarIcon(r.avatar)}</span>{r.username}{r.username === user.username && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> (du)</span>}
              {r.title && titleName(r.title) && <span className="mg-title-badge s">{titleName(r.title)}</span>}</div>
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
// Neues Passwort setzen (eingeloggt – altes Passwort nicht nötig)
export function PasswordForm({ onDone }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const say = (m) => { setMsg(m); if (onDone) onDone(m); };
  const save = async () => {
    if (pw.length < 4) return say('❌ Mindestens 4 Zeichen');
    if (pw !== pw2) return say('❌ Die Passwörter sind nicht gleich');
    setBusy(true);
    try {
      const r = await api.changePassword(pw);
      if (r.error) say('❌ ' + r.error); else { say('✅ Passwort geändert!'); setPw(''); setPw2(''); }
    } catch { say('❌ Server nicht erreichbar'); }
    setBusy(false);
  };
  return (
    <div className="mg-pwform">
      <label className="mg-field"><span>Neues Passwort</span>
        <input type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Mindestens 4 Zeichen" /></label>
      <label className="mg-field"><span>Nochmal eingeben</span>
        <input type="password" autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} placeholder="Zur Sicherheit wiederholen" /></label>
      {msg && !onDone && <div className="mg-pwmsg">{msg}</div>}
      <button className="mg-btn" style={{ width: '100%', marginTop: 12 }} disabled={busy} onClick={save}>{busy ? '⏳ …' : '🔑 Passwort ändern'}</button>
    </div>
  );
}

export function StatsView({ state, onReset }) {
  const [newUsername, setNewUsername] = useState('');
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
        <PasswordForm onDone={(m) => flash(m)} />
        <div style={{ height: 16 }} />
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
