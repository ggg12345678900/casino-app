import React, { useState, useRef, useEffect } from 'react';
import { api } from './api';

const DIFF = {
  easy:   { p: 0.96,  maxPumps: 155, maxMult: 24.5,    label: 'Easy',   color: '#4ade80', cost: 0   },
  medium: { p: 0.882, maxPumps: 74,  maxMult: 2254,    label: 'Medium', color: '#facc15', cost: 100 },
  hard:   { p: 0.797, maxPumps: 52,  maxMult: 52067,   label: 'Hard',   color: '#f97316', cost: 150 },
  expert: { p: 0.60,  maxPumps: 30,  maxMult: 3203384, label: 'Expert', color: '#ef4444', cost: 200 },
};
const getMult = (p, n) => parseFloat((Math.pow(1 / p, n) * 0.98).toFixed(4));

const CSS = `
  @keyframes pump-inflate {
    0%   { transform: scale(1); }
    35%  { transform: scale(1.18) rotate(-2deg); }
    65%  { transform: scale(1.1) rotate(1.5deg); }
    100% { transform: scale(1); }
  }
  @keyframes pump-pop {
    0%   { transform: scale(1);   opacity: 1; }
    30%  { transform: scale(1.6); opacity: 1; }
    60%  { transform: scale(2.4); opacity: 0.5; }
    100% { transform: scale(3.2); opacity: 0; }
  }
  @keyframes pump-cashout {
    0%   { transform: translateY(0)     scale(1);   opacity: 1; }
    100% { transform: translateY(-80px) scale(1.4); opacity: 0; }
  }
  @keyframes shine-pulse {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 0.9; }
  }
  @keyframes pop-particle {
    0%   { transform: translate(-50%,-50%) scale(1); opacity: 1; }
    100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity: 0; }
  }
  @keyframes mult-pop {
    0%   { transform: scale(1); }
    45%  { transform: scale(1.25); }
    100% { transform: scale(1); }
  }
  @keyframes float-balloon {
    0%,100% { transform: translateY(0px); }
    50%     { transform: translateY(-8px); }
  }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes auto-pulse {
    0%,100% { box-shadow: 0 0 0 0 #f59e0b44; }
    50%     { box-shadow: 0 0 0 8px #f59e0b00; }
  }

  .p-ctrl-btn {
    background: #1e3040; border: 1px solid #2d4a5a; border-radius: 8px;
    color: #94a3b8; font-weight: 700; font-size: 13px;
    padding: 10px 0; cursor: pointer; transition: all 0.15s; width: 100%;
  }
  .p-ctrl-btn:hover:not(:disabled) { background: #243a4e; color: #f1f5f9; }
  .p-ctrl-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .p-start-btn {
    width: 100%; padding: 14px 0; border: none; border-radius: 10px;
    font-weight: 700; font-size: 16px; letter-spacing: 0.03em;
    cursor: pointer; transition: all 0.15s;
    background: linear-gradient(135deg, #4ade80, #22c55e);
    color: #0f1923; box-shadow: 0 4px 18px #4ade8033;
  }
  .p-start-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px #4ade8055; }
  .p-start-btn:active:not(:disabled) { transform: scale(0.98); }
  .p-start-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .p-pump-btn {
    flex: 1; padding: 14px 0; border: none; border-radius: 10px;
    font-weight: 700; font-size: 16px; cursor: pointer; transition: all 0.12s;
    background: linear-gradient(135deg, #4ade80, #22c55e);
    color: #0f1923; box-shadow: 0 4px 18px #4ade8033;
  }
  .p-pump-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 24px #4ade8055; }
  .p-pump-btn:active { transform: scale(0.97); }

  .p-cash-btn {
    flex: 1; padding: 14px 0; border: none; border-radius: 10px;
    font-weight: 700; font-size: 16px; cursor: pointer; transition: all 0.12s;
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: #0f1923; box-shadow: 0 4px 18px #f59e0b33;
  }
  .p-cash-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px #f59e0b55; }
  .p-cash-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .p-stop-btn {
    width: 100%; padding: 14px 0; border: none; border-radius: 10px;
    font-weight: 700; font-size: 16px; cursor: pointer; transition: all 0.12s;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white; box-shadow: 0 4px 18px #ef444433;
    animation: auto-pulse 1.5s infinite;
  }
  .p-stop-btn:hover { transform: translateY(-1px); }
`;

function Balloon({ size, color, animState, pumps }) {
  const r = 55 + size * 95;
  const isFloating = animState === 'none' && pumps > 0;
  const anim = animState === 'pop'     ? 'pump-pop 0.55s forwards ease-out'
             : animState === 'cashout' ? 'pump-cashout 0.65s forwards ease-in'
             : animState === 'inflate' ? 'pump-inflate 0.38s ease'
             : isFloating              ? 'float-balloon 3s ease-in-out infinite'
             : 'none';

  return (
    <svg width={r*2+24} height={r*2+72} style={{ animation: anim, overflow: 'visible', transition: 'width 0.3s, height 0.3s' }}>
      <line x1={r+12} y1={r*2+12} x2={r+12} y2={r*2+66} stroke="#64748b" strokeWidth="2" strokeDasharray="4,3"/>
      <ellipse cx={r+12} cy={r*2+70} rx={r*0.38} ry={5} fill="rgba(0,0,0,0.25)"/>
      <ellipse cx={r+12} cy={r+6} rx={r} ry={r*1.12} fill={color}/>
      <ellipse cx={r-12} cy={r-18} rx={r*0.22} ry={r*0.15} fill="rgba(255,255,255,0.38)" style={{ animation:'shine-pulse 2.5s infinite' }}/>
      <ellipse cx={r-4} cy={r-8} rx={r*0.08} ry={r*0.06} fill="rgba(255,255,255,0.2)"/>
      <ellipse cx={r+12} cy={r*2+10} rx={7} ry={9} fill={color}/>
    </svg>
  );
}

function PopParticles({ color }) {
  const pieces = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * 360 + Math.random() * 15;
    const dist = 50 + Math.random() * 80;
    return { tx: Math.cos(angle*Math.PI/180)*dist, ty: Math.sin(angle*Math.PI/180)*dist, size: 6+Math.random()*10, delay: i*0.015 };
  });
  return (
    <div style={{ position:'absolute', top:'50%', left:'50%', pointerEvents:'none', zIndex:20 }}>
      {pieces.map((p,i) => (
        <div key={i} style={{
          position:'absolute', borderRadius:'50%', width:p.size, height:p.size, background:color,
          '--tx':`${p.tx}px`, '--ty':`${p.ty}px`,
          animation:`pop-particle 0.7s ease-out forwards`, animationDelay:`${p.delay}s`,
        }}/>
      ))}
    </div>
  );
}

export default function Pump({ balance, setBalance, addResult, user, setUser }) {
  const unlockedDiffs = (() => {
    try { return JSON.parse(user?.unlocked_diffs || '["easy"]'); }
    catch { return ['easy']; }
  })();
  const [mode, setMode] = useState('manual');
  const [difficulty, setDifficulty] = useState('medium');
  const [bet, setBet] = useState(10);
  const [autoCashAt, setAutoCashAt] = useState(2.0);
  const [phase, setPhase] = useState('idle');
  const [pumps, setPumps] = useState(0);
  const [currentMult, setCurrentMult] = useState(1);
  const [balloonAnim, setBalloonAnim] = useState('none');
  const [showParticles, setShowParticles] = useState(false);
  const [result, setResult] = useState(null);

  const [buyingDiff, setBuyingDiff] = useState(null); // welche diff gerade gekauft wird
  const [buyError, setBuyError]   = useState(null);

  const buyDiff = async (key) => {
    if (buyingDiff) return;
    setBuyingDiff(key);
    setBuyError(null);
    const res = await api.buyDifficulty(key);
    if (res.error) {
      setBuyError(res.error);
      setBuyingDiff(null);
    } else {
      setBalance(res.balance);
      setUser(prev => ({ ...prev, balance: res.balance, unlocked_diffs: res.unlocked_diffs }));
      setDifficulty(key);
      setBuyingDiff(null);
    }
  };

  const animRef   = useRef(null);
  const autoRef   = useRef(null);
  const balRef    = useRef(balance);
  const pumpsRef  = useRef(0);
  const multRef   = useRef(1);
  const phaseRef  = useRef('idle');
  const betRef    = useRef(bet);
  const diffRef   = useRef(difficulty);
  const cashAtRef = useRef(autoCashAt);
  const modeRef   = useRef(mode);

  // Keep refs in sync
  useEffect(() => { balRef.current = balance; }, [balance]);
  useEffect(() => { betRef.current = bet; }, [bet]);
  useEffect(() => { diffRef.current = difficulty; }, [difficulty]);
  useEffect(() => { cashAtRef.current = autoCashAt; }, [autoCashAt]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { pumpsRef.current = pumps; }, [pumps]);
  useEffect(() => { multRef.current = currentMult; }, [currentMult]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => () => { clearTimeout(animRef.current); clearTimeout(autoRef.current); }, []);

  const diff = DIFF[difficulty];
  const balloonSize = Math.min(pumps / diff.maxPumps, 1);
  const balloonColor = phase === 'popped' ? '#374151' : diff.color;
  const winNow  = parseFloat((bet * currentMult).toFixed(2));
  const profNow = parseFloat((winNow - bet).toFixed(2));

  const isIdle    = phase === 'idle';
  const isPlaying = phase === 'playing';
  const isDone    = phase === 'popped' || phase === 'cashedout';

  // ── Auto-reset to idle after result ──
  useEffect(() => {
    if (!isDone) return;
    const t = setTimeout(() => {
      setPhase('idle'); setBalloonAnim('none');
      setShowParticles(false); setResult(null);
      setPumps(0); setCurrentMult(1);
      phaseRef.current = 'idle';
    }, 2500);
    return () => clearTimeout(t);
  }, [isDone]);

  // ── Auto-restart in auto mode ──
  useEffect(() => {
    if (modeRef.current !== 'auto' || !isDone) return;
    const t = setTimeout(() => {
      if (balRef.current >= betRef.current) {
        doStart();
      }
    }, 2600); // slightly after reset
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone]);

  // ── Auto-pump loop ──
  useEffect(() => {
    if (mode !== 'auto' || phase !== 'playing') return;
    clearTimeout(autoRef.current);
    autoRef.current = setTimeout(() => {
      if (phaseRef.current !== 'playing') return;
      if (pumpsRef.current > 0 && multRef.current >= cashAtRef.current) {
        doAutoCashout();
      } else {
        doAutoPump();
      }
    }, 700);
    return () => clearTimeout(autoRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, phase, pumps, currentMult]);

  // ─── Core game actions (using refs so auto-loop can call them safely) ───────

  const doStart = () => {
    const b = betRef.current;
    const bal = balRef.current;
    if (b <= 0 || b > bal) return;
    setBalance(prev => prev - b);
    setPumps(0); pumpsRef.current = 0;
    setCurrentMult(1); multRef.current = 1;
    setBalloonAnim('none'); setShowParticles(false); setResult(null);
    setPhase('playing'); phaseRef.current = 'playing';
  };

  const doAutoPump = () => {
    if (phaseRef.current !== 'playing') return;
    const d = DIFF[diffRef.current];
    const newN = pumpsRef.current + 1;
    const mult = getMult(d.p, newN);

    setBalloonAnim('inflate');
    clearTimeout(animRef.current);
    animRef.current = setTimeout(() => setBalloonAnim('none'), 380);

    if (Math.random() > d.p) {
      setTimeout(() => {
        setBalloonAnim('pop'); setShowParticles(true);
        setPhase('popped'); phaseRef.current = 'popped';
        setResult({ win: false, amount: betRef.current, pumps: newN });
        addResult(false, betRef.current, 'Pump', betRef.current, 0);
        setTimeout(() => setShowParticles(false), 900);
      }, 120);
    } else {
      setPumps(newN); pumpsRef.current = newN;
      setCurrentMult(mult); multRef.current = mult;
      if (newN >= d.maxPumps) {
        const win = parseFloat((betRef.current * mult).toFixed(2));
        setTimeout(() => {
          setBalloonAnim('cashout');
          setPhase('cashedout'); phaseRef.current = 'cashedout';
          setBalance(prev => prev + win);
          setResult({ win: true, amount: win - betRef.current, pumps: newN });
          addResult(true, win - betRef.current, 'Pump', betRef.current, mult);
        }, 180);
      }
    }
  };

  const doAutoCashout = () => {
    if (phaseRef.current !== 'playing' || pumpsRef.current === 0) return;
    const mult = multRef.current;
    const win = parseFloat((betRef.current * mult).toFixed(2));
    setBalloonAnim('cashout');
    setPhase('cashedout'); phaseRef.current = 'cashedout';
    setBalance(prev => prev + win);
    setResult({ win: true, amount: win - betRef.current, pumps: pumpsRef.current });
    addResult(true, win - betRef.current, 'Pump', betRef.current, mult);
  };

  // Manual versions (same logic but using state values directly)
  const doPump = () => {
    if (phase !== 'playing') return;
    doAutoPump();
  };

  const doCashout = () => {
    if (phase !== 'playing' || pumps === 0) return;
    doAutoCashout();
  };

  const stopAuto = () => {
    clearTimeout(autoRef.current);
    setMode('manual');
    modeRef.current = 'manual';
  };

  const halfBet   = () => setBet(b => parseFloat(Math.max(1, b/2).toFixed(2)));
  const doubleBet = () => setBet(b => parseFloat(Math.min(balance, b*2).toFixed(2)));

  return (
    <div style={{ display:'flex', height:'100%', background:'#0f1923', color:'#f1f5f9', fontFamily:"'Segoe UI', sans-serif", minHeight:0 }}>
      <style>{CSS}</style>

      {/* ══ LEFT PANEL ══════════════════════════════════════════════════════ */}
      <div style={{ width:260, flexShrink:0, background:'#1a2c38', borderRight:'1px solid #2d4a5a', display:'flex', flexDirection:'column', gap:0, overflowY:'auto', padding:'16px 14px 24px' }}>

        {/* Mode tabs */}
        <div style={{ display:'flex', background:'#0f1923', borderRadius:8, padding:3, marginBottom:16 }}>
          {['manual','auto'].map(m => (
            <button key={m} onClick={() => { if (isIdle) setMode(m); }}
              disabled={!isIdle}
              style={{ flex:1, textAlign:'center', padding:'7px 0', borderRadius:6,
                background: mode===m ? '#1a2c38' : 'transparent',
                color: mode===m ? '#f1f5f9' : '#475569',
                fontWeight:700, fontSize:13, border:'none', cursor: isIdle ? 'pointer' : 'not-allowed',
                transition:'all 0.15s',
              }}>
              {m === 'manual' ? 'Manuell' : '⚡ Auto'}
            </button>
          ))}
        </div>

        {/* Bet */}
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, color:'#475569', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', display:'block', marginBottom:6 }}>Einsatz</label>
          <div style={{ background:'#0f1923', border:'1px solid #2d4a5a', borderRadius:8, padding:'10px 12px', display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <span style={{ color:'#4ade80', fontWeight:700, fontSize:14 }}>€</span>
            <input type="number" min="1" step="1" value={bet}
              onChange={e => setBet(Math.max(1, Math.min(balance, parseFloat(e.target.value)||1)))}
              disabled={!isIdle}
              style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'#f8fafc', fontSize:16, fontWeight:700 }}/>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button className="p-ctrl-btn" onClick={halfBet}   disabled={!isIdle}>½</button>
            <button className="p-ctrl-btn" onClick={doubleBet} disabled={!isIdle}>2×</button>
            <button className="p-ctrl-btn" onClick={() => setBet(parseFloat(balance.toFixed(2)))} disabled={!isIdle} style={{ fontSize:11 }}>Max</button>
          </div>
        </div>

        {/* Auto: Cash at */}
        {mode === 'auto' && (
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, color:'#475569', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', display:'block', marginBottom:6 }}>
              Auto Cashout bei
            </label>
            <div style={{ background:'#0f1923', border:'1px solid #2d4a5a', borderRadius:8, padding:'10px 12px', display:'flex', alignItems:'center', gap:8 }}>
              <input type="number" min="1.01" step="0.1" value={autoCashAt}
                onChange={e => setAutoCashAt(Math.max(1.01, parseFloat(e.target.value)||2))}
                disabled={!isIdle}
                style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'#f59e0b', fontSize:16, fontWeight:700 }}/>
              <span style={{ color:'#475569', fontSize:13 }}>×</span>
            </div>
          </div>
        )}

        {/* Difficulty */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, color:'#475569', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', display:'block', marginBottom:6 }}>Schwierigkeit</label>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {Object.entries(DIFF).map(([key, d]) => {
              const isUnlocked = unlockedDiffs.includes(key);
              const isSelected = difficulty === key;
              const isBuying   = buyingDiff === key;
              return (
                <div key={key}>
                  <button
                    onClick={() => {
                      if (!isIdle) return;
                      if (isUnlocked) setDifficulty(key);
                      else buyDiff(key);
                    }}
                    disabled={!isIdle || isBuying}
                    style={{
                      width:'100%', padding:'9px 12px', borderRadius:8,
                      border:`1px solid ${isSelected ? d.color : isUnlocked ? '#2d4a5a' : '#1e3040'}`,
                      background: isSelected ? `${d.color}18` : isUnlocked ? '#0f1923' : '#111e28',
                      color: isSelected ? d.color : isUnlocked ? '#64748b' : '#334155',
                      fontWeight:700, fontSize:13,
                      cursor: isIdle ? 'pointer' : 'not-allowed',
                      transition:'all 0.15s', textAlign:'left',
                      display:'flex', justifyContent:'space-between', alignItems:'center',
                    }}>
                    <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                      {!isUnlocked && <span style={{ fontSize:14 }}>🔒</span>}
                      {d.label}
                    </span>
                    <span style={{ fontSize:11, opacity:0.7 }}>
                      {isUnlocked
                        ? `${(d.p*100).toFixed(0)}% · max ${d.maxMult >= 1000 ? `${(d.maxMult/1000).toFixed(0)}K` : d.maxMult}×`
                        : isBuying ? '...' : `${d.cost}€ kaufen`
                      }
                    </span>
                  </button>
                  {/* Kaufen-Bestätigung (inline) */}
                  {!isUnlocked && isIdle && !isBuying && (
                    <div style={{ fontSize:11, color:'#475569', textAlign:'center', marginTop:2 }}>
                      Klicken um freizuschalten
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {buyError && (
            <div style={{ color:'#ef4444', fontSize:12, marginTop:6, textAlign:'center' }}>{buyError}</div>
          )}
        </div>

        {/* Live info */}
        {isPlaying && pumps > 0 && (
          <div style={{ background:'#0f1923', border:`1px solid ${diff.color}33`, borderRadius:8, padding:'10px 12px', marginBottom:12, animation:'fade-in 0.2s ease' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ color:'#475569', fontSize:11 }}>Gewinn jetzt</span>
              <span style={{ color:'#4ade80', fontWeight:700 }}>+{profNow.toFixed(2)}€</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ color:'#475569', fontSize:11 }}>Multiplier</span>
              <span style={{ color:diff.color, fontWeight:700 }}>{currentMult.toFixed(3)}×</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:'#475569', fontSize:11 }}>Nächster</span>
              <span style={{ color:'#94a3b8', fontWeight:700 }}>{getMult(diff.p, pumps+1).toFixed(3)}×</span>
            </div>
          </div>
        )}

        <div style={{ flex:1 }}/>

        {/* Buttons */}
        {isIdle && (
          <button className="p-start-btn" onClick={doStart} disabled={bet <= 0 || bet > balance}>
            {mode === 'auto' ? '⚡ Auto Start' : 'Starten'}
          </button>
        )}

        {isPlaying && mode === 'manual' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ display:'flex', gap:8 }}>
              <button className="p-pump-btn" onClick={doPump}>🎈 Pumpen</button>
              <button className="p-cash-btn" onClick={doCashout} disabled={pumps===0}>💰 Cashout</button>
            </div>
            <div style={{ textAlign:'center', fontSize:11, color:'#334155' }}>
              {pumps} / {diff.maxPumps} Pumps · {(diff.p*100).toFixed(0)}% Chance
            </div>
          </div>
        )}

        {isPlaying && mode === 'auto' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ textAlign:'center', fontSize:13, color:'#f59e0b', fontWeight:700, marginBottom:4 }}>
              ⚡ Auto läuft... {pumps} Pumps
            </div>
            <button className="p-cash-btn" onClick={doCashout} disabled={pumps===0}>💰 Jetzt Cashout</button>
            <button className="p-stop-btn" onClick={stopAuto}>⏹ Stop Auto</button>
          </div>
        )}

        {isDone && (
          <div style={{ textAlign:'center', color:'#475569', fontSize:12 }}>
            Wird zurückgesetzt...
          </div>
        )}
      </div>

      {/* ══ RIGHT PANEL – Game ═══════════════════════════════════════════════ */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>

        {/* Glow */}
        <div style={{
          position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
          width: 160+balloonSize*300, height: 160+balloonSize*300,
          background: `radial-gradient(circle, ${balloonColor}14 0%, transparent 65%)`,
          pointerEvents:'none', transition:'all 0.35s', borderRadius:'50%',
        }}/>

        {/* Result overlay */}
        {result && (
          <div style={{
            position:'absolute', top:28, left:'50%', transform:'translateX(-50%)',
            background: result.win ? '#4ade8018' : '#ef444418',
            border: `1px solid ${result.win ? '#4ade80' : '#ef4444'}`,
            borderRadius:14, padding:'14px 32px', textAlign:'center',
            zIndex:30, animation:'fade-in 0.25s ease', backdropFilter:'blur(8px)',
          }}>
            <div style={{ fontSize:13, color: result.win ? '#4ade80' : '#ef4444', fontWeight:700, marginBottom:4 }}>
              {result.win ? `Cashout bei ${result.pumps} Pumps!` : `Geplatzt bei ${result.pumps} Pump${result.pumps>1?'s':''}!`}
            </div>
            <div style={{ fontSize:28, fontWeight:800, color: result.win ? '#4ade80' : '#ef4444' }}>
              {result.win ? `+${result.amount.toFixed(2)}€` : `-${result.amount.toFixed(2)}€`}
            </div>
            {result.win && <div style={{ fontSize:13, color:'#94a3b8', marginTop:4 }}>{currentMult.toFixed(3)}×</div>}
          </div>
        )}

        {/* Multiplier display */}
        {isPlaying && pumps > 0 && (
          <div style={{ fontSize:48, fontWeight:800, color:diff.color, textShadow:`0 0 30px ${diff.color}66`, marginBottom:12, animation:'mult-pop 0.3s ease', letterSpacing:'-0.02em' }}>
            {currentMult.toFixed(3)}×
          </div>
        )}
        {isPlaying && pumps === 0 && <div style={{ fontSize:18, color:'#334155', marginBottom:12 }}>Bereit zum Pumpen!</div>}
        {isIdle && <div style={{ fontSize:16, color:'#334155', marginBottom:16 }}>Starte das Spiel!</div>}

        {/* Balloon */}
        <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Balloon size={balloonSize} color={balloonColor} animState={balloonAnim} pumps={pumps}/>
          {showParticles && <PopParticles color={diff.color}/>}
        </div>

        {/* Progress bar */}
        {(isPlaying || isDone) && (
          <div style={{ marginTop:16, width:200 }}>
            <div style={{ background:'#1a2c38', borderRadius:6, height:6, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:6, background: phase==='popped' ? '#374151' : diff.color, width:`${(pumps/diff.maxPumps)*100}%`, transition:'width 0.2s ease' }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:11, color:'#334155' }}>
              <span>{pumps} Pumps</span>
              <span>Max {diff.maxPumps}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
