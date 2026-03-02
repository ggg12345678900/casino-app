import React, { useState, useMemo, useCallback, useEffect } from 'react';
import UpgradePanel from './UpgradePanel';

// ─── Constants ──────────────────────────────────────────────────────────────
const VIEWPORT_H = 480;
const LANE_H = 68;
const CHICKEN_TARGET_Y = VIEWPORT_H * 0.68;

// Difficulty: lanes = total lanes to cross, p = survival chance per lane
// Max multiplier = 0.98 / p^lanes  (house edge 2%)
const DIFF = {
  easy:   { lanes: 19, p: 0.854, label: 'Easy',   color: '#4ade80' },
  medium: { lanes: 17, p: 0.624, label: 'Medium',  color: '#facc15' },
  hard:   { lanes: 15, p: 0.474, label: 'Hard',    color: '#f97316' },
  expert: { lanes: 10, p: 0.262, label: 'Expert',  color: '#ef4444' },
};

const CAR_COLORS = ['#dc2626','#2563eb','#d97706','#7c3aed','#0891b2','#b91c1c','#059669'];

// ─── CSS Animations ──────────────────────────────────────────────────────────
const CSS = `
  @keyframes car-ltr {
    from { left: -140px; }
    to   { left: calc(100% + 140px); }
  }
  @keyframes car-rtl {
    from { left: calc(100% + 140px); }
    to   { left: -140px; }
  }
  @keyframes egg-float {
    0%   { transform: translate(-50%, 0)    scale(0.3); opacity: 1; }
    55%  { transform: translate(-50%, -38px) scale(1.1); opacity: 1; }
    100% { transform: translate(-50%, -64px) scale(0.7); opacity: 0; }
  }
  @keyframes chick-hop {
    0%   { transform: translate(-50%,-50%) scaleY(1)    scaleX(1); }
    18%  { transform: translate(-50%,-50%) scaleY(0.65) scaleX(1.3); }
    42%  { transform: translate(-50%,-82%) scaleY(1.2)  scaleX(0.88); }
    68%  { transform: translate(-50%,-50%) scaleY(0.82) scaleX(1.12); }
    84%  { transform: translate(-50%,-50%) scaleY(1.06) scaleX(0.96); }
    100% { transform: translate(-50%,-50%) scaleY(1)    scaleX(1); }
  }
  @keyframes chick-crash {
    0%   { transform: translate(-50%,-50%) rotate(0deg)   scale(1);    filter: brightness(1); }
    20%  { transform: translate(-42%,-44%) rotate(-35deg) scale(1.25); filter: brightness(2.5); }
    55%  { transform: translate(-58%,-50%) rotate(22deg)  scale(0.82); filter: brightness(0.4); }
    100% { transform: translate(-50%,-50%) rotate(-10deg) scale(0.75); filter: brightness(0.25) grayscale(1); }
  }
  @keyframes chick-win {
    0%,100% { transform: translate(-50%,-50%) scale(1)    rotate(0deg); }
    33%     { transform: translate(-50%,-68%) scale(1.35) rotate(-14deg); }
    66%     { transform: translate(-50%,-68%) scale(1.35) rotate(14deg); }
  }
  @keyframes pulse-mult {
    0%,100% { opacity: 0.7; }
    50%     { opacity: 1; }
  }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getMult = (n, p) => parseFloat((0.98 / Math.pow(p, n)).toFixed(2));

function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─── AnimatedCar ─────────────────────────────────────────────────────────────
function AnimatedCar({ ltr, speed, delay, color, wide }) {
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      width: wide ? 80 : 64,
      height: wide ? 36 : 30,
      background: `linear-gradient(160deg, ${color}dd 0%, ${color} 100%)`,
      borderRadius: ltr ? '3px 10px 10px 3px' : '10px 3px 3px 10px',
      animation: `${ltr ? 'car-ltr' : 'car-rtl'} ${speed}s linear ${delay}s infinite`,
      fontSize: 17,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: `0 2px 12px ${color}55`,
      zIndex: 2,
    }}>
      {ltr ? '🚗' : '🚙'}
    </div>
  );
}

// ─── Lane ────────────────────────────────────────────────────────────────────
function Lane({ laneNum, diff, passed, safe, isNext, showEgg }) {
  const mult = getMult(laneNum, diff.p);

  const cars = useMemo(() => {
    const rng = seededRng(laneNum * 2654435761 + diff.lanes * 1000003);
    const count = 2 + Math.floor(rng() * 2);
    return Array.from({ length: count }, () => ({
      ltr: rng() > 0.5,
      speed: 1.5 + rng() * 3.0,
      delay: -(rng() * 6),
      color: CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)],
      wide: rng() > 0.65,
    }));
  }, [laneNum, diff.lanes]);

  const bg = passed
    ? (safe ? '#04100a' : '#10040a')
    : isNext ? '#0d1828' : '#08101a';

  return (
    <div style={{
      height: LANE_H,
      background: bg,
      position: 'relative',
      overflow: 'hidden',
      borderTop: '1px solid #080f1a',
      outline: isNext ? `2px solid ${diff.color}` : 'none',
      outlineOffset: '-2px',
      boxSizing: 'border-box',
      transition: 'background 0.35s',
    }}>
      {/* Road dash */}
      <div style={{
        position: 'absolute', top: '50%', left: 0, right: 0, height: 2,
        background: 'repeating-linear-gradient(90deg, #12202e 0, #12202e 16px, transparent 16px, transparent 32px)',
        transform: 'translateY(-50%)', pointerEvents: 'none',
      }} />

      {/* Moving cars */}
      {!passed && cars.map((c, i) => <AnimatedCar key={i} {...c} />)}

      {/* Passed result */}
      {passed && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          {safe ? '✅' : '💥'}
        </div>
      )}

      {/* Egg pop */}
      {showEgg && (
        <div style={{
          position: 'absolute', left: '50%', top: '55%',
          fontSize: 22, animation: 'egg-float 1s ease-out forwards',
          pointerEvents: 'none', zIndex: 8,
        }}>🥚</div>
      )}

      {/* Lane number */}
      <div style={{
        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
        color: '#192437', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold',
      }}>{laneNum}</div>

      {/* Multiplier badge */}
      <div style={{
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        background: isNext ? `${diff.color}18` : 'rgba(0,0,0,0.45)',
        border: `1px solid ${isNext ? diff.color : '#1a2535'}`,
        borderRadius: 6, padding: '2px 9px',
        color: isNext ? diff.color : passed ? '#2a3a4a' : '#3a5068',
        fontSize: 13, fontWeight: 'bold', fontFamily: 'monospace',
        animation: isNext ? 'pulse-mult 1.5s ease-in-out infinite' : 'none',
      }}>
        {mult}x
      </div>
    </div>
  );
}

// ─── Zones ───────────────────────────────────────────────────────────────────
function StartZone() {
  return (
    <div style={{
      height: LANE_H,
      background: 'linear-gradient(180deg, #08101a 0%, #091808 100%)',
      borderTop: '2px solid #166534',
      display: 'flex', alignItems: 'center', paddingLeft: 44,
      color: '#22c55e', fontSize: 11, fontWeight: 'bold', letterSpacing: '0.12em', textTransform: 'uppercase',
    }}>🌿 Start</div>
  );
}

function FinishZone({ reached }) {
  return (
    <div style={{
      height: LANE_H,
      background: reached
        ? 'linear-gradient(180deg, #0a2010 0%, #08101a 100%)'
        : 'linear-gradient(180deg, #091808 0%, #08101a 100%)',
      borderBottom: '2px solid #166534',
      display: 'flex', alignItems: 'center', paddingLeft: 44,
      color: reached ? '#4ade80' : '#22c55e',
      fontSize: reached ? 14 : 11,
      fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase',
      transition: 'all 0.4s',
    }}>
      {reached ? '🏆 Ziel erreicht!' : '🏁 Ziel'}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Chicken({ balance, setBalance, addResult, maxBet = 50, winBonus = 0, prestigeMult: pMult = 1, globalMult = 1, maxBetLevels, winrateLevels, onUpgradeMaxbet, onUpgradeWinrate }) {
  pMult = pMult * globalMult;
  const [phase, setPhase] = useState('idle');     // idle | playing | hopping | dead | won
  const [bet, setBet] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');
  const [currentLane, setCurrentLane] = useState(0);  // lanes successfully crossed
  const [laneResults, setLaneResults] = useState([]);  // true = safe, false = hit
  const [showEggOn, setShowEggOn] = useState(null);
  const [chickenAnim, setChickenAnim] = useState('idle');
  const [message, setMessage] = useState('');

  const diff = DIFF[difficulty];
  const isPlaying = phase === 'playing';
  const currentMult = currentLane > 0 ? getMult(currentLane, diff.p) : 1;
  const cappedBet = Math.min(bet, maxBet);
  const wMult = parseFloat((1 + winBonus).toFixed(4));

  // ── Road scroll math ─────────────────────────────────────────────────────
  // Road renders top→bottom: [FinishZone, Lane N, Lane N-1, ..., Lane 1, StartZone]
  // Center of lane i (or start zone when i=0) in road coordinates:
  //   chickenRoadY = (diff.lanes + 1 - i) * LANE_H + LANE_H / 2
  // translateY positions that center at CHICKEN_TARGET_Y in the viewport
  const chickenRoadY = (diff.lanes + 1 - currentLane) * LANE_H + LANE_H / 2;
  const translateY = CHICKEN_TARGET_Y - chickenRoadY;

  // ── Actions ──────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    if (cappedBet > balance || cappedBet <= 0) return;
    setBalance(prev => parseFloat((prev - cappedBet).toFixed(2)));
    setPhase('playing');
    setCurrentLane(0);
    setLaneResults([]);
    setShowEggOn(null);
    setChickenAnim('idle');
    setMessage('');
  }, [cappedBet, balance, setBalance]);

  const hop = useCallback(() => {
    if (phase !== 'playing') return;
    setPhase('hopping');
    setChickenAnim('hop');

    // winBonus improves survival probability per lane
    const effectiveP = Math.min(diff.p + winBonus * 0.5, 0.97);
    const survived = Math.random() < effectiveP;
    const nextLane = currentLane + 1;

    setTimeout(() => {
      setCurrentLane(nextLane);
      if (survived) {
        setLaneResults(prev => [...prev, true]);
        setChickenAnim('idle');
        setShowEggOn(nextLane);
        setTimeout(() => setShowEggOn(null), 1000);

        if (nextLane >= diff.lanes) {
          const mult = getMult(nextLane, diff.p);
          const win = parseFloat((cappedBet * mult * pMult * wMult).toFixed(2));
          setBalance(prev => parseFloat((prev + win).toFixed(2)));
          addResult(true, parseFloat((win - cappedBet).toFixed(2)), 'chicken', cappedBet, mult * pMult * wMult);
          setChickenAnim('win');
          setPhase('won');
          setMessage(`🏆 Alle ${diff.lanes} Lanes geschafft! Gewinn: +${(win - cappedBet).toFixed(2)}€`);
        } else {
          setPhase('playing');
        }
      } else {
        setLaneResults(prev => [...prev, false]);
        setChickenAnim('crash');
        addResult(false, cappedBet, 'chicken', cappedBet, 0);
        setPhase('dead');
        setMessage(`💥 Erwischt! ${cappedBet.toFixed(2)}€ verloren.`);
      }
    }, 440);
  }, [phase, currentLane, diff, cappedBet, winBonus, pMult, wMult, setBalance, addResult]);

  const cashout = useCallback(() => {
    if (!isPlaying || currentLane === 0) return;
    const win = parseFloat((cappedBet * currentMult * pMult * wMult).toFixed(2));
    setBalance(prev => parseFloat((prev + win).toFixed(2)));
    addResult(true, parseFloat((win - cappedBet).toFixed(2)), 'chicken', cappedBet, currentMult * pMult * wMult);
    setChickenAnim('win');
    setPhase('won');
    setMessage(`💰 Cashout bei ${currentMult}x! Gewinn: +${(win - cappedBet).toFixed(2)}€`);
  }, [isPlaying, currentLane, cappedBet, currentMult, pMult, wMult, setBalance, addResult]);

  const reset = useCallback(() => {
    setPhase('idle');
    setCurrentLane(0);
    setLaneResults([]);
    setShowEggOn(null);
    setChickenAnim('idle');
    setMessage('');
  }, []);

  // Auto-reset to idle after 2.5s when game ends
  useEffect(() => {
    if (phase !== 'dead' && phase !== 'won') return;
    const t = setTimeout(() => reset(), 2500);
    return () => clearTimeout(t);
  }, [phase, reset]);

  // ── Build road ────────────────────────────────────────────────────────────
  const laneEls = [];
  laneEls.push(<FinishZone key="finish" reached={currentLane >= diff.lanes && phase === 'won'} />);
  for (let i = diff.lanes; i >= 1; i--) {
    laneEls.push(
      <Lane
        key={i}
        laneNum={i}
        diff={diff}
        passed={i <= currentLane}
        safe={laneResults[i - 1]}
        isNext={i === currentLane + 1 && isPlaying}
        showEgg={showEggOn === i}
      />
    );
  }
  laneEls.push(<StartZone key="start" />);

  // ── Chicken emoji / animation ─────────────────────────────────────────────
  const chickenEmoji =
    chickenAnim === 'crash' ? '💀'
    : phase === 'won' && currentLane >= diff.lanes ? '🏆'
    : '🐔';

  const chickenCss =
    chickenAnim === 'hop'   ? 'chick-hop 0.44s ease-out forwards'
    : chickenAnim === 'crash' ? 'chick-crash 0.65s ease-out forwards'
    : chickenAnim === 'win'   ? 'chick-win 0.75s ease-in-out infinite'
    : 'none';

  return (
    <div style={{ background: '#08101a', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#f1f5f9', fontFamily: "'Segoe UI', sans-serif" }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ background: '#0d1828', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a2535' }}>
        <span style={{ fontSize: 18, fontWeight: 'bold', letterSpacing: '0.06em' }}>🐔 CHICKEN</span>
        {phase !== 'idle' && (
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', fontSize: 13 }}>
            <span style={{ color: '#475569' }}>Lane {currentLane} / {diff.lanes}</span>
            {currentLane > 0 && (
              <span style={{ color: '#4ade80', fontWeight: 'bold' }}>
                {currentMult}x → {(cappedBet * currentMult * pMult * wMult).toFixed(2)}€
              </span>
            )}
          </div>
        )}
      </div>

      {/* Road viewport */}
      <div style={{ height: VIEWPORT_H, overflow: 'hidden', position: 'relative', flex: 'none', background: '#06090f' }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 0,
          height: (diff.lanes + 2) * LANE_H,
          transform: `translateY(${translateY}px)`,
          transition: 'transform 0.42s cubic-bezier(0.4,0,0.2,1)',
          willChange: 'transform',
        }}>
          {laneEls}

          {/* Chicken sprite */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: chickenRoadY,
            fontSize: 34,
            lineHeight: 1,
            zIndex: 20,
            animation: chickenCss,
            transform: 'translate(-50%, -50%)',
            textShadow: isPlaying ? '0 0 18px rgba(74,222,128,0.55)' : 'none',
            pointerEvents: 'none',
            transition: 'text-shadow 0.3s',
          }}>
            {chickenEmoji}
          </div>
        </div>

        {/* Edge fade for depth */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(6,9,15,0.9) 0%, transparent 13%, transparent 83%, rgba(6,9,15,0.9) 100%)',
        }} />
      </div>

      {/* Message bar */}
      {message && (
        <div style={{
          padding: '8px 20px', textAlign: 'center', fontWeight: 'bold', fontSize: 14,
          background: phase === 'dead' ? '#1a0606' : '#041408',
          color: phase === 'dead' ? '#f87171' : '#4ade80',
          borderTop: `1px solid ${phase === 'dead' ? '#5a1414' : '#14532d'}`,
        }}>
          {message}
        </div>
      )}

      {/* Controls */}
      <div style={{ padding: '16px', background: '#0d1828', borderTop: '1px solid #1a2535', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {phase === 'idle' && (
          <>
            {/* Bet row */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: '#475569', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', width: 65 }}>Einsatz</span>
              <button onClick={() => setBet(b => Math.max(1, parseFloat((b / 2).toFixed(2))))} style={sBtn}>½</button>
              <input
                type="number" min="1" value={bet}
                onChange={e => setBet(Math.min(Math.max(1, Number(e.target.value)), maxBet))}
                style={{ flex: 1, background: '#06090f', border: '1px solid #1a2535', borderRadius: 8, color: '#f8fafc', padding: '9px 12px', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}
              />
              <button onClick={() => setBet(b => Math.min(balance, maxBet, parseFloat((b * 2).toFixed(2))))} style={sBtn}>2×</button>
            </div>

            {/* Difficulty row */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: '#475569', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', width: 65 }}>Risiko</span>
              {Object.entries(DIFF).map(([key, d]) => (
                <button key={key} onClick={() => setDifficulty(key)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${d.color}`,
                  background: difficulty === key ? d.color : 'transparent',
                  color: difficulty === key ? '#08101a' : d.color,
                  fontSize: 11, fontWeight: 'bold', transition: 'all 0.15s',
                }}>
                  {d.label}
                </button>
              ))}
            </div>

            {/* Info */}
            <div style={{ color: '#2a3a4a', fontSize: 11, textAlign: 'center' }}>
              {diff.lanes} Lanes · {(diff.p * 100).toFixed(0)}% Überlebenschance pro Hop · Max {getMult(diff.lanes, diff.p)}x
            </div>

            <div style={{ background: '#0d1520', border: '1px solid #1a2535', borderRadius: '8px', padding: '8px 10px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: (pMult > 1 || winBonus > 0) ? 4 : 0 }}>
                <span style={{ color: '#475569' }}>Spiel-Mult</span>
                <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>steigt/Lane</span>
              </div>
              {winBonus > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#475569' }}>💰 Bonus</span>
                  <span style={{ color: '#34d399', fontWeight: 'bold' }}>×{wMult.toFixed(2)}</span>
                </div>
              )}
              {pMult > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#475569' }}>⭐ Prestige</span>
                  <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>×{pMult}</span>
                </div>
              )}
              {(pMult > 1 || winBonus > 0) && (
                <div style={{ borderTop: '1px solid #1a2535', paddingTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#475569' }}>Auszahlung ×</span>
                  <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{(pMult * wMult).toFixed(2)}x Bonus</span>
                </div>
              )}
            </div>

            {bet > maxBet && (
              <div style={{ color: '#f59e0b', fontSize: '11px', textAlign: 'center' }}>Max Einsatz: {maxBet}€</div>
            )}
            <button
              onClick={startGame}
              disabled={cappedBet > balance || cappedBet <= 0}
              style={{ ...mBtn, background: cappedBet > balance ? '#1a2535' : '#15803d', color: cappedBet > balance ? '#475569' : '#fff' }}
            >
              🐔 Spielen — {cappedBet.toFixed(2)}€
            </button>

            {onUpgradeMaxbet && (
              <UpgradePanel
                gameId="chicken"
                balance={balance}
                maxBetLevels={maxBetLevels}
                winrateLevels={winrateLevels}
                onUpgradeMaxbet={onUpgradeMaxbet}
                onUpgradeWinrate={onUpgradeWinrate}
              />
            )}
          </>
        )}

        {(phase === 'playing' || phase === 'hopping') && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={cashout}
              disabled={!isPlaying || currentLane === 0}
              style={{
                ...mBtn, flex: 1,
                background: isPlaying && currentLane > 0 ? '#92400e' : '#1a2535',
                color: isPlaying && currentLane > 0 ? '#fbbf24' : '#475569',
              }}
            >
              💰 {currentLane > 0 ? `Cashout (${(cappedBet * currentMult * pMult * wMult).toFixed(2)}€)` : 'Cashout'}
            </button>
            <button
              onClick={hop}
              disabled={phase === 'hopping'}
              style={{
                ...mBtn, flex: 2,
                background: phase === 'hopping' ? '#1a2535' : '#1d4ed8',
                color: phase === 'hopping' ? '#475569' : '#fff',
              }}
            >
              {phase === 'hopping'
                ? '🐔 Hoppt...'
                : `🐔 Hop! → Lane ${currentLane + 1} (${getMult(currentLane + 1, diff.p)}x)`}
            </button>
          </div>
        )}

        {(phase === 'dead' || phase === 'won') && (
          <div style={{ textAlign: 'center', color: '#475569', fontSize: 12, padding: '8px 0' }}>
            Wird zurückgesetzt...
          </div>
        )}
      </div>
    </div>
  );
}

const sBtn = {
  background: '#06090f', border: '1px solid #1a2535', borderRadius: 8,
  color: '#94a3b8', padding: '9px 14px', cursor: 'pointer', fontSize: 14, fontWeight: 'bold',
};
const mBtn = {
  padding: '14px', borderRadius: 10, cursor: 'pointer', border: 'none',
  fontSize: 15, fontWeight: 'bold', letterSpacing: '0.04em', transition: 'all 0.15s',
};
