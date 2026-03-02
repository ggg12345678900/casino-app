import React, { useState } from 'react';
import UpgradePanel from './UpgradePanel';

const style = document.createElement('style');
style.textContent = `
  @keyframes diceRoll {
    0% { transform: rotate(0deg) scale(1); }
    25% { transform: rotate(90deg) scale(1.2); }
    50% { transform: rotate(180deg) scale(1); }
    75% { transform: rotate(270deg) scale(1.2); }
    100% { transform: rotate(360deg) scale(1); }
  }
  .dice-rolling {
    animation: diceRoll 0.4s linear infinite;
    display: inline-block;
  }
`;
document.head.appendChild(style);

function Dice({ balance, setBalance, addResult, maxBet = 50, winBonus = 0, prestigeMult: pMult = 1, globalMult = 1, maxBetLevels, winrateLevels, onUpgradeMaxbet, onUpgradeWinrate }) {
  const ePMult = pMult * globalMult;
  const [bet, setBet] = useState(10);
  const [slider, setSlider] = useState(50.5);
  const [mode, setMode] = useState('over');
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [won, setWon] = useState(null);
  const [history, setHistory] = useState([]);

  const winChance = mode === 'over' ? (100 - slider).toFixed(2) : slider.toFixed(2);
  // winBonus increases effective win chance (capped at 95%)
  const effectiveWinChance = Math.min(parseFloat(winChance) + winBonus * 100, 95).toFixed(2);
  const multiplier = (99 / parseFloat(effectiveWinChance)).toFixed(4);
  const wMult = parseFloat((1 + winBonus).toFixed(4));
  const rawProfit = bet * multiplier - bet;
  const profit = (rawProfit * ePMult * wMult).toFixed(2);
  const cappedBet = Math.min(bet, maxBet);

  const roll = () => {
    if (cappedBet > balance || cappedBet <= 0) return;
    setBalance(prev => parseFloat((prev - cappedBet).toFixed(2)));
    setRolling(true);
    setResult(null);
    setWon(null);

    setTimeout(() => {
      const num = parseFloat((Math.random() * 100).toFixed(2));
      // Apply winBonus: shift the threshold to give player better odds
      const adjustedSlider = mode === 'over'
        ? Math.max(2, slider - winBonus * 100)
        : Math.min(98, slider + winBonus * 100);
      const didWin = mode === 'over' ? num > adjustedSlider : num < adjustedSlider;

      setResult(num);
      setWon(didWin);
      setHistory(prev => [{ num, didWin, bet: cappedBet, profit: parseFloat(profit) }, ...prev].slice(0, 10));

      if (didWin) {
        setBalance(prev => parseFloat((prev + cappedBet + parseFloat(profit)).toFixed(2)));
        addResult(true, parseFloat(profit), 'dice', cappedBet, parseFloat(multiplier) * ePMult * wMult);
      } else {
        addResult(false, cappedBet, 'dice', cappedBet, 1);
      }
      setRolling(false);
    }, 600);
  };

  const getDiceFace = (num) => {
    if (num === null) return '🎲';
    if (num <= 16) return '⚀';
    if (num <= 33) return '⚁';
    if (num <= 50) return '⚂';
    if (num <= 66) return '⚃';
    if (num <= 83) return '⚄';
    return '⚅';
  };

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '30px', boxSizing: 'border-box' }}>

      {/* Left Panel */}
      <div style={{ width: '220px', backgroundColor: '#1a2c38', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0 }}>
        <div>
          <label style={{ color: '#8a9bb0', fontSize: '12px', display: 'block', marginBottom: '6px' }}>EINSATZ</label>
          <div style={{ position: 'relative' }}>
            <input type="number" value={bet} onChange={e => setBet(Math.min(parseFloat(e.target.value) || 0, maxBet))}
              style={{ width: '100%', padding: '10px', paddingRight: '60px', backgroundColor: '#0f1923', border: '1px solid #2d4a5a', color: 'white', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
            <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px' }}>
              <button onClick={() => setBet(prev => parseFloat((prev / 2).toFixed(2)))}
                style={{ backgroundColor: '#2d4a5a', border: 'none', color: '#8a9bb0', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '12px' }}>½</button>
              <button onClick={() => setBet(prev => Math.min(parseFloat((prev * 2).toFixed(2)), maxBet))}
                style={{ backgroundColor: '#2d4a5a', border: 'none', color: '#8a9bb0', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '12px' }}>2x</button>
            </div>
          </div>
        </div>

        <div>
          <label style={{ color: '#8a9bb0', fontSize: '12px', display: 'block', marginBottom: '6px' }}>GEWINN BEI SIEG</label>
          <div style={{ padding: '10px', backgroundColor: '#0f1923', border: '1px solid #2d4a5a', borderRadius: '8px', color: '#00e701', fontSize: '16px' }}>+{profit}</div>
        </div>

        <div style={{ background: '#0f1923', border: '1px solid #2d4a5a', borderRadius: '8px', padding: '8px 10px', fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: (ePMult > 1 || winBonus > 0) ? 4 : 0 }}>
            <span style={{ color: '#8a9bb0' }}>Spiel-Mult</span>
            <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>{multiplier}x</span>
          </div>
          {winBonus > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#8a9bb0' }}>💰 Bonus</span>
              <span style={{ color: '#34d399', fontWeight: 'bold' }}>×{wMult.toFixed(2)}</span>
            </div>
          )}
          {ePMult > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#8a9bb0' }}>⭐ Prestige</span>
              <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>×{ePMult}</span>
            </div>
          )}
          {(ePMult > 1 || winBonus > 0) && (
            <div style={{ borderTop: '1px solid #2d4a5a', paddingTop: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8a9bb0' }}>Gesamt</span>
              <span style={{ color: '#00e701', fontWeight: 'bold' }}>{(parseFloat(multiplier) * ePMult * wMult).toFixed(4)}x</span>
            </div>
          )}
        </div>

        {bet > maxBet && (
          <div style={{ color: '#f59e0b', fontSize: '11px', textAlign: 'center' }}>
            Max Einsatz: {maxBet}€ (Upgrade nötig)
          </div>
        )}

        <button onClick={roll} disabled={rolling || cappedBet > balance || cappedBet <= 0}
          style={{ padding: '14px', backgroundColor: rolling ? '#555' : '#00e701', border: 'none', color: rolling ? '#aaa' : '#000', borderRadius: '8px', cursor: rolling ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold', marginTop: 'auto' }}>
          {rolling ? '⏳ Rolling...' : '🎲 Roll Dice'}
        </button>

        {onUpgradeMaxbet && (
          <UpgradePanel
            gameId="dice"
            balance={balance}
            maxBetLevels={maxBetLevels}
            winrateLevels={winrateLevels}
            onUpgradeMaxbet={onUpgradeMaxbet}
            onUpgradeWinrate={onUpgradeWinrate}
          />
        )}
      </div>

      {/* Right Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Dice Display */}
        <div style={{ backgroundColor: '#1a2c38', borderRadius: '12px', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>

          {/* Big Dice */}
          <div className={rolling ? 'dice-rolling' : ''} style={{ fontSize: '120px', lineHeight: 1, marginBottom: '10px' }}>
            {rolling ? '🎲' : getDiceFace(result)}
          </div>

          {/* Result Number */}
          <div style={{
            fontSize: '52px', fontWeight: 'bold', marginBottom: '8px',
            color: result === null ? '#8a9bb0' : won ? '#00e701' : '#ff4444',
            textShadow: result !== null ? (won ? '0 0 30px #00e70155' : '0 0 30px #ff444455') : 'none',
            transition: 'color 0.3s'
          }}>
            {rolling ? '...' : result !== null ? result.toFixed(2) : '?'}
          </div>

          {/* Win/Loss Message */}
          <div style={{ fontSize: '22px', minHeight: '35px', fontWeight: 'bold', color: won ? '#00e701' : '#ff4444' }}>
            {result !== null && !rolling ? (won ? `🎉 +${profit} €` : `😢 -${bet} €`) : ''}
          </div>

          {/* Slider */}
          <div style={{ width: '100%', marginTop: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#8a9bb0', fontSize: '12px' }}>
              {[0, 25, 50, 75, 100].map(n => <span key={n}>{n}</span>)}
            </div>

            <div style={{ position: 'relative', height: '14px', borderRadius: '7px', marginBottom: '24px' }}>
              <div style={{
                position: 'absolute', width: '100%', height: '100%', borderRadius: '7px',
                background: mode === 'over'
                  ? `linear-gradient(to right, #ff4444 0%, #ff4444 ${slider}%, #00e701 ${slider}%, #00e701 100%)`
                  : `linear-gradient(to right, #00e701 0%, #00e701 ${slider}%, #ff4444 ${slider}%, #ff4444 100%)`
              }} />

              {result !== null && !rolling && (
                <div style={{
                  position: 'absolute', left: `${result}%`, top: '-8px', transform: 'translateX(-50%)',
                  width: '30px', height: '30px', backgroundColor: won ? '#00e701' : '#ff4444',
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 'bold', color: '#000', border: '2px solid white', zIndex: 10
                }}>
                  {result.toFixed(0)}
                </div>
              )}

              <input type="range" min="2" max="98" step="0.5" value={slider}
                onChange={e => setSlider(parseFloat(e.target.value))}
                style={{ position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)', width: '100%', margin: 0, opacity: 0, cursor: 'pointer', height: '30px', zIndex: 5 }} />

              <div style={{
                position: 'absolute', left: `${slider}%`, top: '50%', transform: 'translate(-50%, -50%)',
                width: '24px', height: '24px', backgroundColor: 'white', borderRadius: '50%',
                border: '3px solid #8a9bb0', pointerEvents: 'none', zIndex: 4
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#8a9bb0', fontSize: '12px', marginBottom: '4px' }}>MULTIPLIKATOR</div>
                <input readOnly value={(parseFloat(multiplier) * ePMult * wMult).toFixed(4)} style={{ width: '100px', padding: '8px', backgroundColor: '#0f1923', border: '1px solid #2d4a5a', color: 'white', borderRadius: '8px', textAlign: 'center', fontSize: '15px' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#8a9bb0', fontSize: '12px', marginBottom: '4px' }}>ROLL {mode === 'over' ? 'OVER' : 'UNDER'}</div>
                <button onClick={() => setMode(m => m === 'over' ? 'under' : 'over')}
                  style={{ width: '110px', padding: '8px', backgroundColor: mode === 'over' ? '#00e70122' : '#ff444422', border: `1px solid ${mode === 'over' ? '#00e701' : '#ff4444'}`, color: mode === 'over' ? '#00e701' : '#ff4444', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                  {slider.toFixed(2)} {mode === 'over' ? '↑' : '↓'}
                </button>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#8a9bb0', fontSize: '12px', marginBottom: '4px' }}>GEWINNCHANCE</div>
                <input readOnly value={effectiveWinChance} style={{ width: '100px', padding: '8px', backgroundColor: '#0f1923', border: '1px solid #2d4a5a', color: 'white', borderRadius: '8px', textAlign: 'center', fontSize: '15px' }} />
              </div>
            </div>
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div style={{ backgroundColor: '#1a2c38', borderRadius: '12px', padding: '16px' }}>
            <div style={{ color: '#8a9bb0', fontSize: '12px', letterSpacing: '1px', marginBottom: '12px' }}>LETZTE ERGEBNISSE</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {history.map((h, i) => (
                <div key={i} style={{
                  padding: '6px 12px', borderRadius: '6px',
                  backgroundColor: h.didWin ? '#00e70122' : '#ff444422',
                  border: `1px solid ${h.didWin ? '#00e701' : '#ff4444'}`,
                  color: h.didWin ? '#00e701' : '#ff4444',
                  fontSize: '13px', fontWeight: 'bold'
                }}>
                  {h.num.toFixed(2)} {h.didWin ? '↑' : '↓'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dice;