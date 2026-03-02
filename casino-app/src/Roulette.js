import React, { useState, useRef } from 'react';
import UpgradePanel from './UpgradePanel';

const NUMBERS = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const getColor = (n) => n === 0 ? '#00a550' : RED_NUMBERS.includes(n) ? '#c0392b' : '#111111';
const CHIP_VALUES = [1, 5, 10, 50, 100, 500];
const CHIP_COLORS = {1:'#3498db',5:'#2ecc71',10:'#c0392b',50:'#9b59b6',100:'#f39c12',500:'#2c3e50'};
const SLICE_DEG = 360 / NUMBERS.length;

const checkWin = (betKey, num) => {
  if (betKey === `num_${num}`) return true;
  if (betKey === 'red') return RED_NUMBERS.includes(num);
  if (betKey === 'black') return !RED_NUMBERS.includes(num) && num !== 0;
  if (betKey === 'even') return num !== 0 && num % 2 === 0;
  if (betKey === 'odd') return num % 2 !== 0;
  if (betKey === 'low') return num >= 1 && num <= 18;
  if (betKey === 'high') return num >= 19 && num <= 36;
  if (betKey === 'dozen1') return num >= 1 && num <= 12;
  if (betKey === 'dozen2') return num >= 13 && num <= 24;
  if (betKey === 'dozen3') return num >= 25 && num <= 36;
  if (betKey === 'col1') return num !== 0 && num % 3 === 1;
  if (betKey === 'col2') return num !== 0 && num % 3 === 2;
  if (betKey === 'col3') return num !== 0 && num % 3 === 0;
  return false;
};

const getMultiplier = (betKey) => {
  if (betKey.startsWith('num_')) return 36;
  if (['red','black','even','odd','low','high'].includes(betKey)) return 2;
  if (['dozen1','dozen2','dozen3','col1','col2','col3'].includes(betKey)) return 3;
  return 0;
};

// Build conic-gradient for wheel
const buildWheelGradient = () => {
  const parts = [];
  NUMBERS.forEach((num, i) => {
    const start = i * SLICE_DEG;
    const end = (i + 1) * SLICE_DEG;
    parts.push(`${getColor(num)} ${start}deg ${end}deg`);
  });
  return `conic-gradient(${parts.join(', ')})`;
};

const WHEEL_GRADIENT = buildWheelGradient();

const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes overlayIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes wheelIn {
    from { transform: scale(0.4); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  @keyframes resultPop {
    0%   { transform: scale(0.5); opacity: 0; }
    70%  { transform: scale(1.15); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes ballDecelOrbit {
    from { transform: rotate(-90deg) translateX(var(--orbit-r)) rotate(90deg); }
    to   { transform: rotate(calc(2790deg + var(--ball-offset))) translateX(var(--orbit-r)) rotate(calc(-2790deg - var(--ball-offset))); }
  }
  .overlay-in { animation: overlayIn 0.3s ease forwards; }
  .wheel-in { animation: wheelIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards; }
  .result-pop { animation: resultPop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards; }
`;
document.head.appendChild(styleEl);

function RouletteWheel({ size, rotation, spinning, duration, ballVisible, ballOffset = 0 }) {
  const S = size;
  const R = S / 2;
  const orbitR = R * 0.88;
  const ballSize = size > 200 ? 13 : 7;

  return (
    <div style={{ width: S, height: S, position: 'relative', flexShrink: 0 }}>
      {/* Outer ring */}
      <div style={{
        position: 'absolute', inset: -6,
        borderRadius: '50%',
        background: 'radial-gradient(circle, #8B6914, #5D4037)',
        boxShadow: '0 0 30px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.5)'
      }} />

      {/* Wheel */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%',
        background: WHEEL_GRADIENT,
        transform: `rotate(${rotation}deg)`,
        transition: spinning ? `transform ${duration}ms cubic-bezier(0.15, 0.85, 0.35, 1.0)` : 'none',
        overflow: 'hidden',
      }}>
        {/* Number labels */}
        {NUMBERS.map((num, i) => {
          const angleDeg = i * SLICE_DEG + SLICE_DEG / 2;
          const angleRad = (angleDeg - 90) * Math.PI / 180;
          const labelR = R * 0.78;
          const x = R + Math.cos(angleRad) * labelR;
          const y = R + Math.sin(angleRad) * labelR;
          return (
            <div key={i} style={{
              position: 'absolute',
              left: x, top: y,
              transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
              color: 'white',
              fontSize: size > 200 ? '11px' : '7px',
              fontWeight: 'bold',
              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
              pointerEvents: 'none',
              lineHeight: 1,
            }}>{num}</div>
          );
        })}

        {/* Dividers */}
        {NUMBERS.map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: R, top: R,
            width: R,
            height: 1,
            backgroundColor: 'rgba(201,168,76,0.4)',
            transformOrigin: '0 50%',
            transform: `rotate(${i * SLICE_DEG}deg)`,
          }} />
        ))}
      </div>

      {/* Center cap */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: R * 0.28, height: R * 0.28,
        borderRadius: '50%',
        background: 'radial-gradient(circle, #C9A84C, #7B5800)',
        boxShadow: '0 0 10px rgba(0,0,0,0.5)',
        zIndex: 5,
      }} />

      {/* Ball - orbits in outer track while spinning, lands in winning pocket at top */}
      {ballVisible && (
        <div
          style={{
            position: 'absolute',
            left: '50%', top: '50%',
            width: 0, height: 0,
            zIndex: 15,
            ...(spinning
              ? { animation: `ballDecelOrbit ${duration}ms cubic-bezier(0.05, 0.9, 0.15, 1) forwards`, '--orbit-r': `${orbitR}px`, '--ball-offset': `${ballOffset}deg` }
              : { transform: `rotate(${ballOffset}deg) translateY(-${R * 0.82}px)` }
            ),
          }}
        >
          <div style={{
            position: 'absolute',
            width: ballSize,
            height: ballSize,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #ffffff, #dddddd)',
            boxShadow: '0 0 8px rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,0.8)',
            transform: 'translate(-50%, -50%)',
          }} />
        </div>
      )}
    </div>
  );
}

function Roulette({ balance, setBalance, addResult, maxBet = 50, winBonus = 0, prestigeMult: pMult = 1, maxBetLevels, winrateLevels, onUpgradeMaxbet, onUpgradeWinrate }) {
  const [phase, setPhase] = useState('betting');
  const [showOverlay, setShowOverlay] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spinDuration, setSpinDuration] = useState(6000);
  const [result, setResult] = useState(null);
  const [bets, setBets] = useState({});
  const [selectedChip, setSelectedChip] = useState(10);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [winAmt, setWinAmt] = useState(0);
  const [ballVisible, setBallVisible] = useState(false);
  const currentRotation = useRef(0);
  const ballOffsetRef = useRef(0);

  const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);
  const cappedTotalBet = Math.min(totalBet, maxBet);

  const spin = () => {
    if (phase !== 'betting' || cappedTotalBet <= 0 || cappedTotalBet > balance) return;
    setBalance(prev => parseFloat((prev - cappedTotalBet).toFixed(2)));
    setShowOverlay(true);
    setBallVisible(true);

    // winBonus: reroll once if result is 0 (house pocket)
    let winIndex = Math.floor(Math.random() * NUMBERS.length);
    if (winBonus > 0 && NUMBERS[winIndex] === 0 && Math.random() < winBonus * 2) {
      winIndex = Math.floor(Math.random() * (NUMBERS.length - 1)) + 1;
    }
    const winNum = NUMBERS[winIndex];

    // Ball lands at random angle, wheel rotates so winning slice ends up exactly there
    const ballOffset = (Math.random() - 0.5) * 160;
    ballOffsetRef.current = ballOffset;
    const targetRotation = ballOffset - (winIndex * SLICE_DEG + SLICE_DEG / 2);
    const extraSpins = (7 + Math.floor(Math.random() * 5)) * 360;
    const finalRotation = currentRotation.current + extraSpins + (targetRotation - (currentRotation.current % 360));
    const duration = 6000 + Math.random() * 2000;

    setSpinDuration(duration);

    setTimeout(() => {
      setSpinning(true);
      setPhase('spinning');
      setRotation(finalRotation);
      currentRotation.current = finalRotation;
    }, 100);

    setTimeout(() => {
      setSpinning(false);
      setPhase('result');
      setResult(winNum);
      setHistory(prev => [winNum, ...prev].slice(0, 20));

      let totalWin = 0;
      const betRatio = cappedTotalBet / (totalBet || 1);
      Object.entries(bets).forEach(([key, amount]) => {
        if (checkWin(key, winNum)) totalWin += amount * betRatio * getMultiplier(key) * pMult;
      });
      totalWin = parseFloat(totalWin.toFixed(2));

      setWinAmt(totalWin);

      if (totalWin > 0) {
        setBalance(prev => parseFloat((prev + totalWin).toFixed(2)));
        const profit = totalWin - cappedTotalBet;
        setMessage(`+${totalWin.toFixed(2)}€`);
        addResult(true, profit, 'roulette', cappedTotalBet, parseFloat((totalWin / cappedTotalBet).toFixed(2)));
      } else {
        setMessage(`-${cappedTotalBet.toFixed(2)}€`);
        addResult(false, cappedTotalBet, 'roulette', cappedTotalBet, 0);
      }
    }, duration + 200);
  };

  const closeOverlay = () => {
    setShowOverlay(false);
    setPhase('betting');
    setBallVisible(false);
  };

  const placeBet = (betKey) => {
    if (phase !== 'betting') return;
    setBets(prev => ({ ...prev, [betKey]: (prev[betKey] || 0) + selectedChip }));
  };

  const BetBtn = ({ betKey, label, color, style = {} }) => {
    const hasBet = bets[betKey] > 0;
    const isWin = result !== null && checkWin(betKey, result);
    return (
      <div onClick={() => placeBet(betKey)} style={{
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: color || '#1e3a4a',
        border: `2px solid ${isWin ? '#FFD700' : hasBet ? '#00e701' : '#2d5060'}`,
        borderRadius: '4px',
        cursor: phase === 'betting' ? 'pointer' : 'not-allowed',
        color: 'white', fontWeight: 'bold', fontSize: '11px',
        transition: 'border-color 0.15s',
        boxShadow: isWin ? '0 0 10px #FFD700' : 'none',
        userSelect: 'none',
        ...style
      }}>
        {label}
        {hasBet && (
          <div style={{
            position: 'absolute', top: -7, right: -7,
            width: 16, height: 16,
            backgroundColor: CHIP_COLORS[selectedChip],
            borderRadius: '50%', fontSize: '8px', fontWeight: 'bold',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid white', zIndex: 5, color: 'white'
          }}>{bets[betKey]}</div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', position: 'relative', backgroundColor: '#0f1923' }}>

      {/* BETTING VIEW */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', overflow: 'auto' }}>

        {/* Top: chips + small wheel */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1, backgroundColor: '#1a2c38', borderRadius: '10px', padding: '12px' }}>
            <div style={{ color: '#8a9bb0', fontSize: '10px', letterSpacing: '1px', marginBottom: '8px' }}>CHIP WÄHLEN</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {CHIP_VALUES.map(v => (
                <div key={v} onClick={() => setSelectedChip(v)} style={{
                  width: 40, height: 40, borderRadius: '50%',
                  backgroundColor: CHIP_COLORS[v],
                  border: `3px solid ${selectedChip === v ? '#FFD700' : 'transparent'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', color: 'white',
                  boxShadow: selectedChip === v ? '0 0 10px #FFD700' : 'none',
                  flexShrink: 0, transition: 'all 0.15s'
                }}>{v}</div>
              ))}
              <div style={{ marginLeft: 'auto', color: '#8a9bb0', fontSize: '13px' }}>
                Gesamt: <span style={{ color: '#00e701', fontWeight: 'bold' }}>{totalBet}€</span>
              </div>
            </div>
          </div>

          {/* Small wheel */}
          <div style={{
            backgroundColor: '#1a2c38', borderRadius: '10px', padding: '12px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0
          }}>
            <RouletteWheel size={100} rotation={rotation} spinning={spinning} duration={spinDuration} ballVisible={false} />
            <div style={{ color: '#8a9bb0', fontSize: '10px' }}>{totalBet > 0 ? '▶ Drehen!' : 'Wette setzen'}</div>
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div style={{ backgroundColor: '#1a2c38', borderRadius: '10px', padding: '10px' }}>
            <div style={{ color: '#8a9bb0', fontSize: '10px', letterSpacing: '1px', marginBottom: '6px' }}>VERLAUF</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {history.map((n, i) => (
                <div key={i} style={{
                  width: 24, height: 24, borderRadius: '50%',
                  backgroundColor: getColor(n),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', fontWeight: 'bold', color: 'white',
                  border: '1px solid #4a6a7a'
                }}>{n}</div>
              ))}
            </div>
          </div>
        )}

        {/* Betting table */}
        <div style={{ backgroundColor: '#1a2c38', borderRadius: '10px', padding: '12px', flex: 1 }}>
          <div style={{ color: '#8a9bb0', fontSize: '10px', letterSpacing: '1px', marginBottom: '8px' }}>WETTEN PLATZIEREN</div>
          <div style={{ display: 'flex', gap: '4px', height: 'calc(100% - 24px)', minHeight: '300px' }}>
            <BetBtn betKey="num_0" label="0" color="#00a550" style={{ width: 30, flexShrink: 0, fontSize: '14px' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: 'repeat(12, 1fr)', gap: '2px' }}>
                {Array.from({ length: 36 }, (_, i) => i + 1).map(num => (
                  <BetBtn key={num} betKey={`num_${num}`} label={num} color={getColor(num)} style={{ fontSize: '12px' }} />
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px', height: '26px' }}>
                <BetBtn betKey="col1" label="Spalte 1" />
                <BetBtn betKey="col2" label="Spalte 2" />
                <BetBtn betKey="col3" label="Spalte 3" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px', height: '26px' }}>
                <BetBtn betKey="dozen1" label="1-12" />
                <BetBtn betKey="dozen2" label="13-24" />
                <BetBtn betKey="dozen3" label="25-36" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '2px', height: '26px' }}>
                <BetBtn betKey="low" label="1-18" />
                <BetBtn betKey="even" label="Even" />
                <BetBtn betKey="red" label="Rot" color="#c0392b" />
                <BetBtn betKey="black" label="Schw." color="#111" />
                <BetBtn betKey="odd" label="Odd" />
                <BetBtn betKey="high" label="19-36" />
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => phase === 'betting' && setBets({})}
            style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', border: '1px solid #ff4444', color: '#ff4444', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            🗑️ Clear
          </button>
          <button onClick={spin} disabled={phase !== 'betting' || cappedTotalBet <= 0 || cappedTotalBet > balance}
            style={{
              flex: 2, padding: '12px',
              backgroundColor: phase !== 'betting' || cappedTotalBet <= 0 ? '#333' : '#00e701',
              border: 'none',
              color: phase !== 'betting' || cappedTotalBet <= 0 ? '#666' : '#000',
              borderRadius: '8px', cursor: phase !== 'betting' || cappedTotalBet <= 0 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold', fontSize: '15px'
            }}>
            🎡 Drehen ({cappedTotalBet}€)
          </button>
        </div>

        {onUpgradeMaxbet && (
          <UpgradePanel
            gameId="roulette"
            balance={balance}
            maxBetLevels={maxBetLevels}
            winrateLevels={winrateLevels}
            onUpgradeMaxbet={onUpgradeMaxbet}
            onUpgradeWinrate={onUpgradeWinrate}
          />
        )}
      </div>

      {/* BIG WHEEL OVERLAY */}
      {showOverlay && (
        <div className="overlay-in" style={{
          position: 'absolute', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.93)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 100, gap: '24px'
        }}>
          <div className="wheel-in">
            <RouletteWheel
              size={360}
              rotation={rotation}
              spinning={spinning}
              duration={spinDuration}
              ballVisible={ballVisible}
              ballOffset={ballOffsetRef.current}
            />
          </div>

          {phase === 'spinning' && (
            <div style={{ color: '#8a9bb0', fontSize: '15px', letterSpacing: '2px' }}>🎡 Dreht sich...</div>
          )}

          {phase === 'result' && result !== null && (
            <div className="result-pop" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  backgroundColor: getColor(result),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '26px', fontWeight: 'bold', color: 'white',
                  border: `4px solid ${winAmt > 0 ? '#FFD700' : '#ff4444'}`,
                  boxShadow: winAmt > 0 ? '0 0 20px #FFD700' : 'none'
                }}>{result}</div>
                <div>
                  <div style={{ color: '#8a9bb0', fontSize: '13px', marginBottom: '4px' }}>
                    {result === 0 ? 'Grün' : RED_NUMBERS.includes(result) ? '🔴 Rot' : '⚫ Schwarz'}
                    {result !== 0 && ` · ${result % 2 === 0 ? 'Gerade' : 'Ungerade'}`}
                  </div>
                  <div style={{ fontSize: '30px', fontWeight: 'bold', color: winAmt > 0 ? '#00e701' : '#ff4444' }}>
                    {message}
                  </div>
                </div>
              </div>
              <button onClick={closeOverlay} style={{
                padding: '14px 50px', backgroundColor: '#00e701',
                border: 'none', color: '#000', borderRadius: '10px',
                cursor: 'pointer', fontWeight: 'bold', fontSize: '16px'
              }}>
                ✓ Weiter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Roulette;