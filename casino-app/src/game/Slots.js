import React, { useState, useRef, useEffect, useCallback } from 'react';
import { fmtMoney, fmt } from './economy';
import { sfx } from './sound';
import {
  SLOT_THEMES, SLOT_WEIGHTS, SLOT_PAYS, SCATTER_WEIGHT, PAIR_LOW, PAIR_OTHER, FREE_SPINS, FREE_SPIN_MULT,
} from './slotThemes';

// Symbole als Zahlen: 0–5 normale Symbole, 6 = Scatter (Freispiele)
const S = 6;
const WEIGHTS = [...SLOT_WEIGHTS, SCATTER_WEIGHT];
const TOTAL_W = WEIGHTS.reduce((a, b) => a + b, 0);
const roll = () => {
  let r = Math.random() * TOTAL_W;
  for (let i = 0; i < WEIGHTS.length; i++) { if (r < WEIGHTS[i]) return i; r -= WEIGHTS[i]; }
  return 0;
};
// Gewinn der Mittellinie als Vielfaches des Einsatzes
const linePay = (line) => {
  if (line.includes(S)) return 0;
  if (line[0] === line[1] && line[1] === line[2]) return SLOT_PAYS[line[0]];
  if (line.filter(x => x === 0).length === 2) return PAIR_LOW;
  return new Set(line).size === 2 ? PAIR_OTHER : 0;
};

const SYM_H = 88;
const STOP_MS = [850, 1200, 1550];

function Reel({ strip, offset, duration, spinning, theme, winRow, scatterGlow }) {
  const last = strip.length - 3;
  return (
    <div className={`sl-reel${spinning ? ' spinning' : ''}`}>
      <div className="sl-strip" style={{ transform: `translateY(${-offset * SYM_H}px)`, transition: duration ? `transform ${duration}ms cubic-bezier(.15,.85,.25,1.04)` : 'none' }}>
        {strip.map((s, i) => {
          const row = i - last; // 0 oben, 1 Mitte, 2 unten (nur nach dem Stopp relevant)
          const win = !spinning && offset === last && ((winRow && row === 1) || (scatterGlow && s === S && row >= 0));
          return (
            <div key={i} className={`sl-sym${win ? ' win' : ''}${s === S ? ' scatter' : ''}`}>
              {s === S ? theme.scatter : theme.syms[s]}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Slots({ balance, setBalance, addResult, maxBet = 5, winBonus = 0, jackpot = 0, themeId = 'casino', gameId = 'slots' }) {
  const theme = SLOT_THEMES[themeId] || SLOT_THEMES.casino;
  const presets = [0.01, 0.05, 0.1, 0.25, 0.5, 1].map(f => Math.max(0.01, +(maxBet * f).toPrecision(2)));
  const [bet, setBet] = useState(presets[2]);
  const [reels, setReels] = useState(() => [0, 1, 2].map(() => ({ strip: [roll(), roll(), roll()], offset: 0, duration: 0 })));
  const [spinning, setSpinning] = useState(false);
  const [auto, setAuto] = useState(false);
  const [win, setWin] = useState(null);   // { amount, mult, half, row, scatter }
  const [shown, setShown] = useState(0);
  const [free, setFree] = useState({ left: 0, total: 0, won: 0 });
  const [banner, setBanner] = useState(null);
  const autoRef = useRef(false); autoRef.current = auto;
  const balRef = useRef(balance); balRef.current = balance;
  const freeRef = useRef(free); freeRef.current = free;
  const betRef = useRef(bet); betRef.current = bet;
  const bonus = 1 + winBonus * 0.5;
  const inFree = free.left > 0;

  useEffect(() => {
    if (!win || !win.amount) { setShown(0); return undefined; }
    const start = performance.now();
    let raf;
    const step = (t) => { const p = Math.min(1, (t - start) / 700); setShown(win.amount * p); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [win]);

  const spin = useCallback(() => {
    if (spinning) return;
    const isFree = freeRef.current.left > 0;
    const b = isFree ? freeRef.current.bet : Math.min(betRef.current, maxBet);
    if (!isFree && (b <= 0 || b > balRef.current)) { setAuto(false); return; }
    if (!isFree) setBalance(prev => +(prev - b).toFixed(2));
    else setFree(f => ({ ...f, left: f.left - 1 }));
    setSpinning(true);
    setWin(null);
    const grid = [0, 1, 2].map(() => [roll(), roll(), roll()]); // je Walze: oben, Mitte, unten
    setReels(cur => cur.map((r, i) => {
      const visible = r.strip.slice(r.offset, r.offset + 3);
      const filler = Array.from({ length: 14 + i * 5 }, roll);
      return { strip: [...visible, ...filler, ...grid[i]], offset: 0, duration: 0 };
    }));
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setReels(cur => cur.map((r, i) => ({ ...r, offset: r.strip.length - 3, duration: STOP_MS[i] })));
    }));
    const ticker = setInterval(() => sfx.tick(), 85);
    setTimeout(() => {
      clearInterval(ticker);
      const line = grid.map(col => col[1]);
      const scatters = grid.flat().filter(x => x === S).length;
      const fsMult = isFree ? FREE_SPIN_MULT : 1;
      const base = linePay(line);
      let mult = base * fsMult * (base >= 1 ? bonus : 1);
      const amount = +(b * mult).toFixed(2);
      if (amount > 0) setBalance(prev => +(prev + amount).toFixed(2));

      if (isFree) {
        if (amount > 0) addResult(true, amount, gameId, b, base === SLOT_PAYS[5] ? 250 : mult);
        setFree(f => ({ ...f, won: f.won + amount }));
      } else if (base === PAIR_OTHER) {
        addResult(false, +(b - amount).toFixed(2), gameId, b, 0.5);
      } else if (base > 0) {
        addResult(true, +(amount - b).toFixed(2), gameId, b, base === SLOT_PAYS[5] ? 250 : mult);
      } else {
        addResult(false, b, gameId, b, 1);
      }

      if (amount > 0) setWin({ amount, mult, half: base === PAIR_OTHER && !isFree, row: true });
      if (base >= 1 && mult < 10) sfx.win(); else if (base === PAIR_OTHER) sfx.tick();

      // Freispiele: 3+ Scatter irgendwo im Fenster
      if (scatters >= 3) {
        sfx.bigWin();
        setWin(w => ({ ...(w || { amount: 0, mult: 0 }), scatter: true }));
        setFree(f => ({ left: (isFree ? f.left : 0) + FREE_SPINS, total: (isFree ? f.total : 0) + FREE_SPINS, won: isFree ? f.won : 0, bet: b }));
        setBanner(isFree ? `+${FREE_SPINS} FREISPIELE!` : `${FREE_SPINS} FREISPIELE! Gewinne ×${FREE_SPIN_MULT}`);
        setTimeout(() => setBanner(null), 2200);
      } else if (isFree && freeRef.current.left === 0) {
        // letzte Freispiel-Runde vorbei
        const total = freeRef.current.won;
        setBanner(`Freispiele vorbei: ${fmtMoney(total)}`);
        setTimeout(() => setBanner(null), 2600);
      }
      setSpinning(false);
    }, STOP_MS[2] + 80);
  }, [spinning, maxBet, setBalance, addResult, bonus, gameId]);

  // Freispiele laufen automatisch, Auto-Spin auf Wunsch
  useEffect(() => {
    if (spinning) return undefined;
    if (free.left > 0) { const t = setTimeout(spin, banner ? 2300 : 700); return () => clearTimeout(t); }
    if (!auto) return undefined;
    const t = setTimeout(() => { if (autoRef.current) spin(); }, win ? 900 : 350);
    return () => clearTimeout(t);
  }, [auto, spinning, spin, win, free.left, banner]);

  const b = inFree ? free.bet : Math.min(bet, maxBet);
  const canSpin = !spinning && !inFree && b > 0 && b <= balance;
  const style = { '--c1': theme.c1, '--c2': theme.c2, '--neon': theme.neon, '--glass': theme.glass };

  return (
    <div className="sl-wrap">
      <div className={`sl-cabinet${win && !win.half ? ' hot' : ''}${inFree ? ' free' : ''}`} style={style}>
        <div className="sl-bulbs" />
        <div className="sl-top">
          <div className="sl-marquee">{theme.name.toUpperCase()}</div>
          <div className="sl-jackpot">{theme.syms[5]}{theme.syms[5]}{theme.syms[5]} = ×250 + JACKPOT {fmtMoney(jackpot)}</div>
        </div>
        {inFree && <div className="sl-free">🎁 FREISPIELE {free.total - free.left}/{free.total} · Gewinne ×{FREE_SPIN_MULT} · bisher {fmtMoney(free.won)}</div>}
        <div className={`sl-window${win && !win.half && win.amount > 0 ? ' won' : ''}`}>
          {reels.map((r, i) => <Reel key={i} {...r} spinning={spinning} theme={theme} winRow={!!(win && win.row && !win.half)} scatterGlow={!!(win && win.scatter)} />)}
          <div className="sl-line" />
          {banner && <div className="sl-banner">{banner}</div>}
        </div>
        <div className={`sl-led${win && !win.half && win.amount > 0 ? ' won' : ''}`}>
          {win && win.amount > 0
            ? (win.half ? <>HALBER EINSATZ ZURÜCK <b>{fmtMoney(shown)}</b></> : <>GEWINN <b>{fmtMoney(shown)}</b> <span>×{fmt(win.mult, 1)}</span></>)
            : spinning ? (inFree ? 'Freispiel…' : 'Viel Glück…') : inFree ? 'Freispiele laufen…' : 'Setz deinen Einsatz!'}
        </div>
        <div className="sl-controls">
          <div className="sl-bets">
            {presets.map(p => (
              <button key={p} className={`sl-chip${Math.abs(bet - p) < 1e-9 ? ' on' : ''}`} disabled={spinning || inFree} onClick={() => setBet(p)}>{fmt(p).replace(/,0+(?= |$)/, '')}</button>
            ))}
          </div>
          <div className="sl-actions">
            <button className={`sl-auto${auto ? ' on' : ''}`} onClick={() => setAuto(a => !a)}>{auto ? '⏹ STOP' : '🔁 AUTO'}</button>
            <button className="sl-spin" disabled={!canSpin} onClick={spin}>{inFree ? 'FREE' : spinning ? '…' : 'SPIN'}</button>
          </div>
          <div className="sl-betinfo">Einsatz <b>{fmtMoney(b)}</b>{bet > maxBet && ' (Max)'}</div>
        </div>
      </div>
      <div className="sl-paytable">
        <div className="mg-label">Gewinntabelle</div>
        {[5, 4, 3, 2, 1, 0].map(i => (
          <div key={i} className="sl-pay"><span>{theme.syms[i]}{theme.syms[i]}{theme.syms[i]}</span><b>×{SLOT_PAYS[i]}{i === 5 ? ' + 💰' : ''}</b></div>
        ))}
        <div className="sl-pay"><span>{theme.syms[0]}{theme.syms[0]} + beliebig</span><b>×{PAIR_LOW}</b></div>
        <div className="sl-pay"><span style={{ fontSize: 15 }}>2 Gleiche</span><b>×0,5</b></div>
        <div className="sl-pay"><span>{theme.scatter}{theme.scatter}{theme.scatter} <small style={{ fontSize: 12 }}>irgendwo</small></span><b>{FREE_SPINS} Freispiele</b></div>
        <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>In Freispielen zählt jeder Gewinn doppelt. Gewertet wird die mittlere Reihe.</div>
        {winBonus > 0 && <div style={{ color: 'var(--green)', fontSize: 12, marginTop: 6, fontWeight: 800 }}>Dein Zocken-Bonus: +{(winBonus * 50).toFixed(1)}% auf Gewinne</div>}
      </div>
    </div>
  );
}
