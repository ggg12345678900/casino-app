import React, { useState, useEffect, useRef } from 'react';

const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
  @keyframes crashShake {
    0% { transform: translateX(0); }
    25% { transform: translateX(-6px); }
    50% { transform: translateX(6px); }
    75% { transform: translateX(-4px); }
    100% { transform: translateX(0); }
  }
  .pulsing { animation: pulse 0.8s ease infinite; }
  .crash-shake { animation: crashShake 0.4s ease; }
`;
document.head.appendChild(styleEl);

const FAKE_NAMES = ['Alex', 'Maria', 'John', 'Sarah', 'Mike', 'Emma', 'Tom', 'Lisa', 'Max', 'Nina', 'Lars', 'Kimi', 'Finn', 'Lena', 'Ben', 'Mia'];

function generateFakePlayers() {
  const count = Math.floor(Math.random() * 8) + 4;
  const players = [];
  for (let i = 0; i < count; i++) {
    const name = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
    const bet = [10, 20, 50, 100, 200, 500][Math.floor(Math.random() * 6)];
    const autoCashout = Math.random() > 0.4 ? parseFloat((Math.random() * 4 + 1.2).toFixed(2)) : null;
    players.push({ id: i, name, bet, autoCashout, cashedOut: false, cashoutMult: null });
  }
  return players;
}

function generateCrashPoint() {
  const r = Math.random();
  if (r < 0.33) return parseFloat((Math.random() * 0.8 + 1.0).toFixed(2));
  if (r < 0.6)  return parseFloat((Math.random() * 1.5 + 1.5).toFixed(2));
  if (r < 0.8)  return parseFloat((Math.random() * 3 + 2).toFixed(2));
  if (r < 0.95) return parseFloat((Math.random() * 10 + 4).toFixed(2));
  return parseFloat((Math.random() * 50 + 10).toFixed(2));
}

function Crash({ balance, setBalance, addResult }) {
  const [bet, setBet] = useState(10);
  const [autoCashoutVal, setAutoCashoutVal] = useState(2.0);
  const MIN_AUTOCASHOUT = 1.1;
  const [useAutoCashout, setUseAutoCashout] = useState(false);
  const [phase, setPhase] = useState('waiting'); // waiting | running | crashed
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(null);
  const [hasPlaced, setHasPlaced] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashoutMult, setCashoutMult] = useState(null);
  const [fakePlayers, setFakePlayers] = useState([]);
  const [history, setHistory] = useState([]);
  const [countdown, setCountdown] = useState(5);
  const [graphPoints, setGraphPoints] = useState([]);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);
  const multRef = useRef(1.0);
  const crashRef = useRef(null);
  const hasPlacedRef = useRef(false);
  const cashedOutRef = useRef(false);
  const betRef = useRef(bet);
  const autoCashoutRef = useRef(autoCashoutVal);
  const useAutoCashoutRef = useRef(useAutoCashout);

  useEffect(() => { betRef.current = bet; }, [bet]);
  useEffect(() => { autoCashoutRef.current = autoCashoutVal; }, [autoCashoutVal]);
  useEffect(() => { useAutoCashoutRef.current = useAutoCashout; }, [useAutoCashout]);
  useEffect(() => { hasPlacedRef.current = hasPlaced; }, [hasPlaced]);
  useEffect(() => { cashedOutRef.current = cashedOut; }, [cashedOut]);

  const canvasRef = useRef(null);

  // Draw graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (graphPoints.length < 2) return;

    const maxMult = Math.max(...graphPoints, 2);
    const toX = (i) => (i / (graphPoints.length - 1)) * (W - 40) + 20;
    const toY = (m) => H - 30 - ((m - 1) / (maxMult - 1)) * (H - 50);

    // Grid lines
    ctx.strokeStyle = '#2d4a5a';
    ctx.lineWidth = 1;
    [1, 2, 5, 10].forEach(v => {
      if (v <= maxMult) {
        const y = toY(v);
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(20, y);
        ctx.lineTo(W - 20, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#8a9bb0';
        ctx.font = '10px Arial';
        ctx.fillText(`${v}x`, 2, y + 4);
      }
    });

    // Curve
    const crashed = phase === 'crashed';
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, crashed ? '#ff4444' : '#00e701');
    grad.addColorStop(1, crashed ? '#ff2200' : '#00cc00');

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(graphPoints[0]));
    graphPoints.forEach((m, i) => {
      if (i === 0) return;
      ctx.lineTo(toX(i), toY(m));
    });
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Fill under curve
    ctx.lineTo(toX(graphPoints.length - 1), H - 30);
    ctx.lineTo(toX(0), H - 30);
    ctx.closePath();
    ctx.fillStyle = crashed ? 'rgba(255,68,68,0.1)' : 'rgba(0,231,1,0.08)';
    ctx.fill();

    // Dot at end
    const lastX = toX(graphPoints.length - 1);
    const lastY = toY(graphPoints[graphPoints.length - 1]);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
    ctx.fillStyle = crashed ? '#ff4444' : '#00e701';
    ctx.fill();

  }, [graphPoints, phase]);

  const startCountdown = () => {
    setPhase('waiting');
    setMultiplier(1.0);
    setGraphPoints([]);
    setCashedOut(false);
    setCashoutMult(null);
    cashedOutRef.current = false;
    setHasPlaced(false);
    hasPlacedRef.current = false;
    multRef.current = 1.0;
    const cp = generateCrashPoint();
    setCrashPoint(cp);
    crashRef.current = cp;
    setFakePlayers(generateFakePlayers());
    setCountdown(5);

    let c = 5;
    countdownRef.current = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(countdownRef.current);
        startRound();
      }
    }, 1000);
  };

  const startRound = () => {
    setPhase('running');
    let tick = 0;

    intervalRef.current = setInterval(() => {
      tick++;
      const newMult = parseFloat((1 + tick * tick * 0.0012 + tick * 0.008).toFixed(2));
      multRef.current = newMult;
      setMultiplier(newMult);
      setGraphPoints(prev => [...prev, newMult]);

      // Fake players cashout
      setFakePlayers(prev => prev.map(p => {
        if (!p.cashedOut && p.autoCashout && newMult >= p.autoCashout) {
          return { ...p, cashedOut: true, cashoutMult: p.autoCashout };
        }
        // Random manual cashout
        if (!p.cashedOut && !p.autoCashout && Math.random() < 0.015) {
          return { ...p, cashedOut: true, cashoutMult: newMult };
        }
        return p;
      }));

      // Auto cashout player
      if (useAutoCashoutRef.current && hasPlacedRef.current && !cashedOutRef.current && autoCashoutRef.current >= MIN_AUTOCASHOUT && newMult >= autoCashoutRef.current) {
        handleCashout(newMult);
      }

      // Crash
      if (newMult >= crashRef.current) {
        clearInterval(intervalRef.current);
        setPhase('crashed');

        // Player lost if not cashed out
        if (hasPlacedRef.current && !cashedOutRef.current) {
          addResult(false, betRef.current);
        }

        setHistory(prev => [{ mult: crashRef.current }, ...prev].slice(0, 20));

        // Start next round after 3s
        setTimeout(startCountdown, 3000);
      }
    }, 60);
  };

  const handleCashout = (currentMult) => {
    if (!hasPlacedRef.current || cashedOutRef.current) return;
    cashedOutRef.current = true;
    setCashedOut(true);
    setCashoutMult(currentMult);
    const winAmount = parseFloat((betRef.current * currentMult).toFixed(2));
    const profit = parseFloat((winAmount - betRef.current).toFixed(2));
    setBalance(prev => parseFloat((prev + winAmount).toFixed(2)));
    addResult(true, profit);
  };

  const placeBet = () => {
    if (phase !== 'waiting' || hasPlaced || bet > balance || bet <= 0) return;
    setBalance(prev => parseFloat((prev - bet).toFixed(2)));
    setHasPlaced(true);
    hasPlacedRef.current = true;
  };

 useEffect(() => {
    startCountdown();
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(countdownRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const multColor = phase === 'crashed' ? '#ff4444' : cashedOut ? '#f5a623' : '#00e701';

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '30px', boxSizing: 'border-box' }}>

      {/* Left Panel */}
      <div style={{ width: '220px', backgroundColor: '#1a2c38', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', flexShrink: 0 }}>

        {/* Bet */}
        <div>
          <label style={{ color: '#8a9bb0', fontSize: '12px', display: 'block', marginBottom: '6px' }}>EINSATZ</label>
          <div style={{ position: 'relative' }}>
            <input type="number" value={bet} onChange={e => setBet(parseFloat(e.target.value))}
              disabled={phase === 'running' || hasPlaced}
              style={{ width: '100%', padding: '10px', paddingRight: '60px', backgroundColor: '#0f1923', border: '1px solid #2d4a5a', color: 'white', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box', opacity: (phase === 'running' || hasPlaced) ? 0.5 : 1 }} />
            <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px' }}>
              <button onClick={() => setBet(prev => parseFloat((prev / 2).toFixed(2)))} disabled={phase === 'running' || hasPlaced}
                style={{ backgroundColor: '#2d4a5a', border: 'none', color: '#8a9bb0', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '12px' }}>½</button>
              <button onClick={() => setBet(prev => parseFloat((prev * 2).toFixed(2)))} disabled={phase === 'running' || hasPlaced}
                style={{ backgroundColor: '#2d4a5a', border: 'none', color: '#8a9bb0', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '12px' }}>2x</button>
            </div>
          </div>
        </div>

        {/* Auto Cashout */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ color: '#8a9bb0', fontSize: '12px' }}>AUTO CASHOUT</label>
            <div onClick={() => setUseAutoCashout(p => !p)}
              style={{ width: '36px', height: '20px', backgroundColor: useAutoCashout ? '#00e701' : '#2d4a5a', borderRadius: '10px', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ position: 'absolute', top: '2px', left: useAutoCashout ? '18px' : '2px', width: '16px', height: '16px', backgroundColor: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
            </div>
          </div>
          {useAutoCashout && (
            <input type="number" value={autoCashoutVal} step="0.1" min="1.05"
              onChange={e => setAutoCashoutVal(Math.max(MIN_AUTOCASHOUT, parseFloat(e.target.value)))}
              style={{ width: '100%', padding: '8px', backgroundColor: '#0f1923', border: '1px solid #00e701', color: 'white', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
          )}
        </div>

        {/* Bet / Cashout Button */}
        {phase === 'waiting' && !hasPlaced && (
          <button onClick={placeBet} disabled={bet > balance || bet <= 0}
            style={{ padding: '14px', backgroundColor: '#00e701', border: 'none', color: '#000', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}>
            🚀 Einsatz setzen
          </button>
        )}
        {phase === 'waiting' && hasPlaced && (
          <div style={{ padding: '14px', backgroundColor: '#00e70133', border: '1px solid #00e701', borderRadius: '8px', textAlign: 'center', color: '#00e701', fontWeight: 'bold' }}>
            ✅ Einsatz gesetzt!
          </div>
        )}
        {phase === 'running' && hasPlaced && !cashedOut && (
          <button onClick={() => handleCashout(multRef.current)}
            style={{ padding: '14px', backgroundColor: '#f5a623', border: 'none', color: '#000', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}
            className="pulsing">
            💰 Cash Out ({(bet * multRef.current).toFixed(2)})
          </button>
        )}
        {phase === 'running' && hasPlaced && cashedOut && (
          <div style={{ padding: '14px', backgroundColor: '#f5a62333', border: '1px solid #f5a623', borderRadius: '8px', textAlign: 'center', color: '#f5a623', fontWeight: 'bold' }}>
            ✅ Cashed out @ {cashoutMult}x
          </div>
        )}
        {phase === 'running' && !hasPlaced && (
          <div style={{ padding: '14px', backgroundColor: '#2d4a5a', borderRadius: '8px', textAlign: 'center', color: '#8a9bb0', fontSize: '13px' }}>
            Nächste Runde abwarten...
          </div>
        )}
        {phase === 'crashed' && (
          <div style={{ padding: '14px', backgroundColor: '#ff444433', border: '1px solid #ff4444', borderRadius: '8px', textAlign: 'center', color: '#ff4444', fontWeight: 'bold' }}>
            💥 Crashed @ {crashPoint}x
          </div>
        )}

        {/* History */}
        <div>
          <div style={{ color: '#8a9bb0', fontSize: '11px', letterSpacing: '1px', marginBottom: '8px' }}>VERLAUF</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {history.map((h, i) => (
              <div key={i} style={{
                padding: '3px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold',
                backgroundColor: h.mult < 1.5 ? '#ff444422' : h.mult < 3 ? '#f5a62322' : '#00e70122',
                color: h.mult < 1.5 ? '#ff4444' : h.mult < 3 ? '#f5a623' : '#00e701',
                border: `1px solid ${h.mult < 1.5 ? '#ff4444' : h.mult < 3 ? '#f5a623' : '#00e701'}`
              }}>
                {h.mult}x
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Graph */}
        <div style={{ backgroundColor: '#1a2c38', borderRadius: '12px', padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* Multiplier Display */}
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            {phase === 'waiting' ? (
              <div>
                <div style={{ color: '#8a9bb0', fontSize: '16px' }}>Nächste Runde startet in</div>
                <div style={{ fontSize: '60px', fontWeight: 'bold', color: '#00e701' }}>{countdown}s</div>
              </div>
            ) : (
              <div className={phase === 'crashed' ? 'crash-shake' : ''}>
                <div style={{ fontSize: '14px', color: '#8a9bb0', marginBottom: '4px' }}>
                  {phase === 'crashed' ? '💥 CRASHED' : cashedOut ? '✅ CASHED OUT' : '🚀 LIVE'}
                </div>
                <div style={{ fontSize: '64px', fontWeight: 'bold', color: multColor, textShadow: `0 0 30px ${multColor}55`, transition: 'color 0.1s' }}>
                  {multiplier.toFixed(2)}x
                </div>
              </div>
            )}
          </div>

          {/* Canvas Graph */}
          <canvas ref={canvasRef} width={700} height={280}
            style={{ width: '100%', flex: 1, borderRadius: '8px', backgroundColor: '#0f1923' }} />
        </div>

        {/* Players Table */}
        <div style={{ backgroundColor: '#1a2c38', borderRadius: '12px', padding: '16px' }}>
          <div style={{ color: '#8a9bb0', fontSize: '11px', letterSpacing: '1px', marginBottom: '10px' }}>SPIELER</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', fontSize: '12px' }}>
            <div style={{ color: '#8a9bb0', paddingBottom: '6px', borderBottom: '1px solid #2d4a5a' }}>Name</div>
            <div style={{ color: '#8a9bb0', paddingBottom: '6px', borderBottom: '1px solid #2d4a5a', textAlign: 'center' }}>Einsatz</div>
            <div style={{ color: '#8a9bb0', paddingBottom: '6px', borderBottom: '1px solid #2d4a5a', textAlign: 'right' }}>Cashout</div>

            {/* Real player */}
            {hasPlaced && (
              <>
                <div style={{ padding: '4px 0', color: '#00e701', fontWeight: 'bold' }}>Du</div>
                <div style={{ padding: '4px 0', textAlign: 'center', color: 'white' }}>{bet}</div>
                <div style={{ padding: '4px 0', textAlign: 'right', color: cashedOut ? '#00e701' : phase === 'crashed' ? '#ff4444' : '#8a9bb0', fontWeight: 'bold' }}>
                  {cashedOut ? `${cashoutMult}x` : phase === 'crashed' ? '💥' : '...'}
                </div>
              </>
            )}

            {/* Fake players */}
            {fakePlayers.map(p => (
              <React.Fragment key={p.id}>
                <div style={{ padding: '4px 0', color: 'white' }}>{p.name}</div>
                <div style={{ padding: '4px 0', textAlign: 'center', color: '#8a9bb0' }}>{p.bet}</div>
                <div style={{ padding: '4px 0', textAlign: 'right', color: p.cashedOut ? '#00e701' : phase === 'crashed' ? '#ff4444' : '#8a9bb0', fontWeight: 'bold' }}>
                  {p.cashedOut ? `${p.cashoutMult}x` : phase === 'crashed' ? '💥' : '...'}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Crash;