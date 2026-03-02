import React, { useState, useRef, useEffect } from 'react';
import UpgradePanel from './UpgradePanel';

const MULTIPLIERS = {
  8: {
    low:    [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    high:   [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
  },
  12: {
    low:    [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    high:   [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
  },
  16: {
    low:    [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
    medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
    high:   [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  },
};

const BUCKET_COLOR = (mult) => {
  if (mult >= 100) return '#ff2200';
  if (mult >= 10)  return '#ff6b00';
  if (mult >= 3)   return '#ff4444';
  if (mult >= 1.5) return '#f5a623';
  if (mult >= 1)   return '#8bc34a';
  return '#1557a0';
};

const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes bucketPop {
    0%   { transform: translateX(-50%) translateY(0)   scaleY(1);    filter: brightness(1); }
    25%  { transform: translateX(-50%) translateY(4px) scaleY(0.80); filter: brightness(2.2); }
    65%  { transform: translateX(-50%) translateY(-1px) scaleY(1.05); filter: brightness(1.1); }
    100% { transform: translateX(-50%) translateY(0)   scaleY(1);    filter: brightness(1); }
  }
  .bucket-pop { animation: bucketPop 0.4s cubic-bezier(0.36,0.07,0.19,0.97); transform-origin: bottom; }
`;
document.head.appendChild(styleEl);

let nextId = 0;

function Plinko({ balance, setBalance, addResult, maxBet = 50, winBonus = 0, prestigeMult: pMult = 1, maxBetLevels, winrateLevels, onUpgradeMaxbet, onUpgradeWinrate }) {
  const [bet, setBet] = useState(10);
  const [rows, setRows] = useState(12);
  const [risk, setRisk] = useState('medium');
  const [activeBalls, setActiveBalls] = useState([]);
  const [history, setHistory] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [ballCount, setBallCount] = useState(1);
  const [ballsLeft, setBallsLeft] = useState(0);
  const boardRef = useRef(null);
  const bucketRefs = useRef([]);
  const [boardSize, setBoardSize] = useState({ width: 400, height: 400 });
  const balanceRef = useRef(balance);
  useEffect(() => { balanceRef.current = balance; }, [balance]);
  const cappedBet = Math.min(bet, maxBet);

  const mults = MULTIPLIERS[rows][risk];
  const transitionMs = rows === 16 ? 70 : rows === 12 ? 85 : 100;

  // Auto-drop queue: when ballsLeft > 0, drop next ball after delay
  useEffect(() => {
    if (ballsLeft <= 0) return;
    const delay = rows === 16 ? 900 : rows === 12 ? 1000 : 1100;
    const t = setTimeout(() => {
      if (cappedBet > 0 && cappedBet <= balanceRef.current) {
        dropBall();
        setBallsLeft(l => l - 1);
      } else {
        setBallsLeft(0);
      }
    }, delay);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ballsLeft]);

  // Measure board size dynamically
  useEffect(() => {
    const measure = () => {
      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        setBoardSize({ width: rect.width, height: rect.height });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const { width: W, height: H } = boardSize;
  const BUCKET_H = 28;
  const TOP_PAD = 16;
  const usableH = H - BUCKET_H - TOP_PAD;
  const pinSpacingY = usableH / rows;
  const pinSpacingX = (W * 0.82) / (rows + 1);

  const getPinX = (row, col) => {
    const pinsInRow = row + 2;
    const totalWidth = (pinsInRow - 1) * pinSpacingX;
    return W / 2 - totalWidth / 2 + col * pinSpacingX;
  };

  const getPinY = (row) => TOP_PAD + row * pinSpacingY + pinSpacingY * 0.3;

  const getBucketX = (i) => {
    const count = rows + 1;
    const totalWidth = (count - 1) * pinSpacingX;
    return W / 2 - totalWidth / 2 + i * pinSpacingX;
  };

  const getBallPos = (ball) => {
    if (ball.currentRow === -1) return { x: W / 2, y: TOP_PAD - 10 };
    if (ball.finished) return { x: getBucketX(ball.finalBucket), y: H - BUCKET_H / 2 };
    const row = ball.currentRow;
    const col = ball.currentCol;
    const pinsInRow = row + 2;
    const totalWidth = (pinsInRow - 1) * pinSpacingX;
    const x = W / 2 - totalWidth / 2 + col * pinSpacingX;
    const y = getPinY(row) + pinSpacingY * 0.55;
    return { x, y };
  };

  const dropBall = () => {
    if (cappedBet > balance || cappedBet <= 0) return;
    setBalance(prev => parseFloat((prev - cappedBet).toFixed(2)));

    const path = [];
    let col = 0;
    for (let r = 0; r < rows; r++) {
      // winBonus nudges ball toward center (higher multiplier buckets at edges)
      const goRight = Math.random() < (0.5 - winBonus * 0.1);
      if (goRight) col++;
      path.push(col);
    }

    const finalBucket = col;
    const mult = mults[finalBucket];
    const winAmount = parseFloat((cappedBet * mult * pMult).toFixed(2));
    const profitAmount = parseFloat((winAmount - cappedBet).toFixed(2));
    const id = nextId++;

    setActiveBalls(prev => [...prev, {
      id, path, currentRow: -1,
      currentCol: Math.floor(rows / 2),
      finalBucket, bet: cappedBet, mult, winAmount, profitAmount,
      finished: false
    }]);

    let step = 0;
    const speed = rows === 16 ? 75 : rows === 12 ? 90 : 110;
    const interval = setInterval(() => {
      if (step >= rows) {
        clearInterval(interval);
        setBalance(p => parseFloat((p + winAmount).toFixed(2)));
        setLastResult({ mult, winAmount, profitAmount });
        setHistory(h => [{ mult }, ...h].slice(0, 10));
        if (mult >= 1) addResult(true, profitAmount, 'plinko', cappedBet, mult);
        else addResult(false, Math.abs(profitAmount), 'plinko', cappedBet, mult);

        // Animate ball into bucket
        setActiveBalls(prev => prev.map(b => b.id === id ? { ...b, finished: true } : b));

        // Bucket pop after ball lands
        setTimeout(() => {
          const ref = bucketRefs.current[finalBucket];
          if (ref) {
            ref.classList.remove('bucket-pop');
            void ref.offsetWidth;
            ref.classList.add('bucket-pop');
          }
        }, transitionMs + 40);

        // Remove ball after landing
        setTimeout(() => setActiveBalls(prev => prev.filter(b => b.id !== id)), transitionMs + 350);
        return;
      }
      setActiveBalls(prev => prev.map(b =>
        b.id === id ? { ...b, currentRow: step, currentCol: path[step] } : b
      ));
      step++;
    }, speed);
  };

  const pinR = Math.max(4, Math.min(6, pinSpacingX * 0.18));
  const ballR = pinR * 1.5;

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px', boxSizing: 'border-box', height: '100%' }}>

      {/* Left Panel */}
      <div style={{ width: '200px', backgroundColor: '#1a2c38', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', flexShrink: 0 }}>

        <div>
          <label style={{ color: '#8a9bb0', fontSize: '12px', display: 'block', marginBottom: '6px' }}>EINSATZ</label>
          <div style={{ position: 'relative' }}>
            <input type="number" value={bet} onChange={e => setBet(Math.min(parseFloat(e.target.value) || 0, maxBet))}
              style={{ width: '100%', padding: '8px', paddingRight: '55px', backgroundColor: '#0f1923', border: '1px solid #2d4a5a', color: 'white', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
            <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '3px' }}>
              <button onClick={() => setBet(prev => parseFloat((prev / 2).toFixed(2)))}
                style={{ backgroundColor: '#2d4a5a', border: 'none', color: '#8a9bb0', borderRadius: '4px', padding: '2px 5px', cursor: 'pointer', fontSize: '11px' }}>½</button>
              <button onClick={() => setBet(prev => Math.min(parseFloat((prev * 2).toFixed(2)), maxBet))}
                style={{ backgroundColor: '#2d4a5a', border: 'none', color: '#8a9bb0', borderRadius: '4px', padding: '2px 5px', cursor: 'pointer', fontSize: '11px' }}>2x</button>
            </div>
          </div>
        </div>

        <div>
          <label style={{ color: '#8a9bb0', fontSize: '12px', display: 'block', marginBottom: '6px' }}>REIHEN</label>
          <div style={{ display: 'flex', gap: '5px' }}>
            {[8, 12, 16].map(r => (
              <button key={r} onClick={() => { setRows(r); setActiveBalls([]); }}
                style={{ flex: 1, padding: '7px', backgroundColor: rows === r ? '#00e701' : '#0f1923', border: '1px solid #2d4a5a', color: rows === r ? '#000' : '#8a9bb0', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ color: '#8a9bb0', fontSize: '12px', display: 'block', marginBottom: '6px' }}>RISIKO</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {[['low', 'Niedrig', '#8bc34a'], ['medium', 'Mittel', '#f5a623'], ['high', 'Hoch', '#ff4444']].map(([val, label, color]) => (
              <button key={val} onClick={() => setRisk(val)}
                style={{ padding: '7px', backgroundColor: risk === val ? color + '33' : '#0f1923', border: `1px solid ${risk === val ? color : '#2d4a5a'}`, color: risk === val ? color : '#8a9bb0', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Ball Count */}
        <div>
          <label style={{ color: '#8a9bb0', fontSize: '12px', display: 'block', marginBottom: '6px' }}>ANZAHL BÄLLE</label>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {[1, 3, 5, 10, 25].map(n => (
              <button key={n} onClick={() => { if (ballsLeft === 0) setBallCount(n); }}
                disabled={ballsLeft > 0}
                style={{ flex: 1, minWidth: '30px', padding: '6px 4px', backgroundColor: ballCount === n ? '#00e701' : '#0f1923', border: '1px solid #2d4a5a', color: ballCount === n ? '#000' : '#8a9bb0', borderRadius: '6px', cursor: ballsLeft > 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {lastResult && (
          <div style={{ padding: '10px', backgroundColor: lastResult.mult >= 1 ? '#00e70122' : '#ff444422', border: `1px solid ${lastResult.mult >= 1 ? '#00e701' : '#ff4444'}`, borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: lastResult.mult >= 1 ? '#00e701' : '#ff4444' }}>{lastResult.mult}x</div>
            <div style={{ fontSize: '12px', color: lastResult.mult >= 1 ? '#00e701' : '#ff4444' }}>
              {lastResult.profitAmount >= 0 ? '+' : ''}{lastResult.profitAmount} €
            </div>
          </div>
        )}

        {/* Drop button + countdown */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {ballsLeft > 0 && (
            <div style={{ textAlign: 'center', background: '#0f1923', border: '1px solid #00e70144', borderRadius: '8px', padding: '8px' }}>
              <div style={{ color: '#00e701', fontWeight: 'bold', fontSize: '20px' }}>{ballsLeft}</div>
              <div style={{ color: '#8a9bb0', fontSize: '11px' }}>Bälle verbleibend</div>
            </div>
          )}
          {bet > maxBet && (
          <div style={{ color: '#f59e0b', fontSize: '11px', textAlign: 'center' }}>Max Einsatz: {maxBet}€</div>
        )}
        <button
            onClick={() => {
              if (ballsLeft > 0) { setBallsLeft(0); return; }
              if (cappedBet > balance || cappedBet <= 0) return;
              dropBall();
              if (ballCount > 1) setBallsLeft(ballCount - 1);
            }}
            disabled={(cappedBet > balance || cappedBet <= 0) && ballsLeft === 0}
            style={{ padding: '12px', backgroundColor: ballsLeft > 0 ? '#ef4444' : '#00e701', border: 'none', color: ballsLeft > 0 ? '#fff' : '#000', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}>
            {ballsLeft > 0 ? '⏹ Stopp' : ballCount > 1 ? `🎯 Drop ${ballCount} Bälle` : '🎯 Drop Ball'}
          </button>

        {onUpgradeMaxbet && (
          <UpgradePanel
            gameId="plinko"
            balance={balance}
            maxBetLevels={maxBetLevels}
            winrateLevels={winrateLevels}
            onUpgradeMaxbet={onUpgradeMaxbet}
            onUpgradeWinrate={onUpgradeWinrate}
          />
        )}
        </div>

        {history.length > 0 && (
          <div>
            <div style={{ color: '#8a9bb0', fontSize: '11px', marginBottom: '6px' }}>LETZTE</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {history.map((h, i) => (
                <div key={i} style={{ padding: '3px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold', backgroundColor: h.mult >= 1 ? '#00e70122' : '#ff444422', border: `1px solid ${h.mult >= 1 ? '#00e701' : '#ff4444'}`, color: h.mult >= 1 ? '#00e701' : '#ff4444' }}>
                  {h.mult}x
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Board */}
      <div style={{ flex: 1, backgroundColor: '#1a2c38', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ color: '#8a9bb0', fontSize: '13px', letterSpacing: '1px', marginBottom: '8px' }}>🎯 PLINKO</div>

        <div ref={boardRef} style={{ flex: 1, position: 'relative', backgroundColor: '#0f1923', borderRadius: '8px', overflow: 'hidden' }}>

          {/* Pins */}
          {boardSize.width > 100 && Array.from({ length: rows }, (_, row) =>
            Array.from({ length: row + 2 }, (_, col) => (
              <div key={`${row}-${col}`} style={{
                position: 'absolute',
                left: getPinX(row, col),
                top: getPinY(row),
                width: pinR * 2,
                height: pinR * 2,
                backgroundColor: '#8a9bb0',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
              }} />
            ))
          )}

          {/* Balls */}
          {activeBalls.map(ball => {
            const pos = getBallPos(ball);
            return (
              <div key={ball.id} style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: ballR * 2,
                height: ballR * 2,
                backgroundColor: '#f5a623',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 8px #f5a623aa',
                transition: ball.finished
                  ? `left ${transitionMs * 2}ms ease-in, top ${transitionMs * 2}ms ease-in`
                  : `left ${transitionMs}ms cubic-bezier(0.25,0.46,0.45,0.94), top ${transitionMs}ms cubic-bezier(0.25,0.46,0.45,0.94)`,
                zIndex: 10,
              }} />
            );
          })}

          {/* Buckets */}
          {boardSize.width > 100 && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: BUCKET_H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {mults.map((mult, i) => (
                <div key={i} ref={el => bucketRefs.current[i] = el}
                  style={{
                    position: 'absolute',
                    left: getBucketX(i),
                    transform: 'translateX(-50%)',
                    width: pinSpacingX - 3,
                    height: BUCKET_H - 4,
                    borderRadius: '5px',
                    backgroundColor: BUCKET_COLOR(mult),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: rows === 16 ? '8px' : rows === 12 ? '9px' : '11px',
                    fontWeight: 'bold', color: 'white',
                    transformOrigin: 'bottom',
                  }}>
                  {mult}x
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Plinko;