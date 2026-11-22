import React, { useState, useRef, useEffect, useCallback } from 'react';
import { fmtMoney, fmt } from './economy';
import { sfx } from './sound';

// Walzen-Symbole mit Gewicht (Häufigkeit). Ausschüttung ≈ 96,1 %; bei ~53 % der Drehs kommt etwas zurück.
const SYMBOLS = [
  { s: '🍒', w: 7, pay: 5 },
  { s: '🍋', w: 6, pay: 8 },
  { s: '🔔', w: 5, pay: 12 },
  { s: '⭐', w: 4, pay: 25 },
  { s: '💎', w: 2, pay: 60 },
  { s: '7️⃣', w: 1, pay: 250 },
];
const TOTAL_W = SYMBOLS.reduce((a, b) => a + b.w, 0);
const rollSym = () => {
  let r = Math.random() * TOTAL_W;
  for (const x of SYMBOLS) { if (r < x.w) return x.s; r -= x.w; }
  return SYMBOLS[0].s;
};
const payout = (line) => {
  if (line[0] === line[1] && line[1] === line[2]) return SYMBOLS.find(x => x.s === line[0]).pay;
  if (line.filter(x => x === '🍒').length === 2) return 2;
  return new Set(line).size === 2 ? 0.5 : 0; // zwei Gleiche: halber Einsatz zurück
};

const SYM_H = 92;
const STOP_MS = [900, 1250, 1600];

function Reel({ strip, offset, duration }) {
  return (
    <div className="sl-reel">
      <div className="sl-strip" style={{ transform: `translateY(${-offset * SYM_H}px)`, transition: duration ? `transform ${duration}ms cubic-bezier(.15,.85,.25,1.04)` : 'none' }}>
        {strip.map((s, i) => <div key={i} className="sl-sym">{s}</div>)}
      </div>
    </div>
  );
}

export default function Slots({ balance, setBalance, addResult, maxBet = 5, winBonus = 0, jackpot = 0 }) {
  const presets = [0.01, 0.05, 0.1, 0.25, 0.5, 1].map(f => Math.max(0.01, +(maxBet * f).toPrecision(2)));
  const [bet, setBet] = useState(presets[2]);
  const [reels, setReels] = useState(() => [0, 1, 2].map(() => ({ strip: [rollSym(), rollSym(), rollSym()], offset: 0, duration: 0 })));
  const [spinning, setSpinning] = useState(false);
  const [auto, setAuto] = useState(false);
  const [win, setWin] = useState(null); // { amount, mult }
  const [shown, setShown] = useState(0);
  const autoRef = useRef(false);
  autoRef.current = auto;
  const balRef = useRef(balance);
  balRef.current = balance;
  const bonus = 1 + winBonus * 0.5;

  // Gewinn hochzählen
  useEffect(() => {
    if (!win) { setShown(0); return undefined; }
    const start = performance.now();
    let raf;
    const step = (t) => {
      const p = Math.min(1, (t - start) / 700);
      setShown(win.amount * p);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [win]);

  const spin = useCallback(() => {
    const b = Math.min(bet, maxBet);
    if (spinning || b <= 0 || b > balRef.current) { setAuto(false); return; }
    setBalance(prev => +(prev - b).toFixed(2));
    setSpinning(true);
    setWin(null);
    const result = [rollSym(), rollSym(), rollSym()];
    // neue Streifen: aktuell sichtbare oben, dann Zufall, Ergebnis in der Mitte der letzten drei
    setReels(cur => cur.map((r, i) => {
      const visible = r.strip.slice(r.offset, r.offset + 3);
      const filler = Array.from({ length: 14 + i * 5 }, rollSym);
      return { strip: [...visible, ...filler, rollSym(), result[i], rollSym()], offset: 0, duration: 0 };
    }));
    // nächster Frame: losrollen
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setReels(cur => cur.map((r, i) => ({ ...r, offset: r.strip.length - 3, duration: STOP_MS[i] })));
    }));
    const ticker = setInterval(() => sfx.tick(), 85);
    setTimeout(() => {
      clearInterval(ticker);
      const base = payout(result);
      if (base === 0.5) {
        const back = +(b * 0.5).toFixed(2);
        setBalance(prev => +(prev + back).toFixed(2));
        addResult(false, +(b - back).toFixed(2), 'slots', b, 0.5);
        setWin({ amount: back, mult: 0.5, half: true });
        sfx.tick();
      } else if (base > 0) {
        const mult = base * bonus;
        const total = +(b * mult).toFixed(2);
        setBalance(prev => +(prev + total).toFixed(2));
        addResult(true, +(total - b).toFixed(2), 'slots', b, mult);
        setWin({ amount: total, mult });
        if (mult < 10) sfx.win();
      } else {
        addResult(false, b, 'slots', b, 1);
      }
      setSpinning(false);
    }, STOP_MS[2] + 80);
  }, [bet, maxBet, spinning, setBalance, addResult, bonus]);

  // Auto-Spin
  useEffect(() => {
    if (!auto || spinning) return undefined;
    const t = setTimeout(() => { if (autoRef.current) spin(); }, win ? 900 : 350);
    return () => clearTimeout(t);
  }, [auto, spinning, spin, win]);

  const b = Math.min(bet, maxBet);
  const canSpin = !spinning && b > 0 && b <= balance;

  return (
    <div className="sl-wrap">
      <div className="sl-cabinet">
        <div className="sl-top">
          <div className="sl-marquee">MOGUL SLOTS</div>
          <div className="sl-jackpot">7️⃣7️⃣7️⃣ = ×250 + JACKPOT {fmtMoney(jackpot)}</div>
        </div>
        <div className={`sl-window${win && !win.half ? ' won' : ''}`}>
          {reels.map((r, i) => <Reel key={i} {...r} />)}
          <div className="sl-line" />
        </div>
        <div className={`sl-led${win && !win.half ? ' won' : ''}`}>
          {win ? (win.half ? <>HALBER EINSATZ ZURÜCK <b>{fmtMoney(shown)}</b></> : <>GEWINN <b>{fmtMoney(shown)}</b> <span>×{fmt(win.mult, 1)}</span></>) : spinning ? 'Viel Glück…' : 'Setz deinen Einsatz!'}
        </div>
        <div className="sl-controls">
          <div className="sl-bets">
            {presets.map(p => (
              <button key={p} className={`sl-chip${Math.abs(bet - p) < 1e-9 ? ' on' : ''}`} disabled={spinning} onClick={() => setBet(p)}>{fmt(p).replace(/,0+(?= |$)/, '')}</button>
            ))}
          </div>
          <div className="sl-actions">
            <button className={`sl-auto${auto ? ' on' : ''}`} onClick={() => setAuto(a => !a)}>{auto ? '⏹ STOP' : '🔁 AUTO'}</button>
            <button className="sl-spin" disabled={!canSpin} onClick={spin}>{spinning ? '…' : 'SPIN'}</button>
          </div>
          <div className="sl-betinfo">Einsatz <b>{fmtMoney(b)}</b>{bet > maxBet && ' (Max)'}</div>
        </div>
      </div>
      <div className="sl-paytable">
        <div className="mg-label">Gewinntabelle</div>
        {[...SYMBOLS].reverse().map(x => (
          <div key={x.s} className="sl-pay"><span>{x.s}{x.s}{x.s}</span><b>×{x.pay}{x.pay === 250 ? ' + 💰' : ''}</b></div>
        ))}
        <div className="sl-pay"><span>🍒🍒 + beliebig</span><b>×2</b></div>
        <div className="sl-pay"><span style={{ fontSize: 15 }}>2 Gleiche</span><b>×0,5</b></div>
        {winBonus > 0 && <div style={{ color: 'var(--green)', fontSize: 12, marginTop: 8, fontWeight: 800 }}>Dein Zocken-Bonus: +{(winBonus * 50).toFixed(1)}% auf Gewinne</div>}
      </div>
    </div>
  );
}
