import React, { useState } from 'react';
import UpgradePanel from './UpgradePanel';

// Endloses Deck (jede Karte unabhängig gezogen) – fair & einfach
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const drawCard = () => ({
  rank: RANKS[Math.floor(Math.random() * RANKS.length)],
  suit: SUITS[Math.floor(Math.random() * SUITS.length)],
  id: Math.random().toString(36).slice(2),
});

const cardValue = (rank) => (rank === 'A' ? 11 : ['J', 'Q', 'K'].includes(rank) ? 10 : parseInt(rank, 10));

export const handTotal = (cards) => {
  let total = 0;
  let aces = 0;
  cards.forEach(c => { total += cardValue(c.rank); if (c.rank === 'A') aces++; });
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
};

const isBlackjack = (cards) => cards.length === 2 && handTotal(cards).total === 21;

function Card({ card, hidden, index }) {
  const red = card && (card.suit === '♥' || card.suit === '♦');
  return (
    <div style={{
      width: 74, height: 104, borderRadius: 10, marginLeft: index === 0 ? 0 : -22,
      background: hidden ? 'repeating-linear-gradient(45deg, #1e3a5f, #1e3a5f 8px, #2d4a5a 8px, #2d4a5a 16px)' : '#f8fafc',
      border: hidden ? '2px solid #3b82f6' : '2px solid #cbd5e1',
      boxShadow: '0 6px 16px rgba(0,0,0,0.45)',
      color: red ? '#dc2626' : '#0f172a',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: '6px 8px', boxSizing: 'border-box', fontWeight: 'bold',
      animation: 'bjDeal 0.25s ease-out',
    }}>
      {!hidden && (
        <>
          <div style={{ fontSize: 16, lineHeight: 1 }}>{card.rank}<br />{card.suit}</div>
          <div style={{ fontSize: 30, textAlign: 'center', lineHeight: 1 }}>{card.suit}</div>
          <div style={{ fontSize: 16, lineHeight: 1, transform: 'rotate(180deg)' }}>{card.rank}<br />{card.suit}</div>
        </>
      )}
    </div>
  );
}

const style = document.createElement('style');
style.textContent = `@keyframes bjDeal { from { transform: translateY(-30px) scale(0.9); opacity: 0; } to { transform: none; opacity: 1; } }`;
document.head.appendChild(style);

function Blackjack({ balance, setBalance, addResult, maxBet = 50, winBonus = 0, prestigeMult: pMult = 1, globalMult = 1, maxBetLevels, winrateLevels, onUpgradeMaxbet, onUpgradeWinrate }) {
  const ePMult = pMult * globalMult;
  const wMult = parseFloat((1 + winBonus).toFixed(4));
  const [bet, setBet] = useState(10);
  const [player, setPlayer] = useState([]);
  const [dealer, setDealer] = useState([]);
  const [phase, setPhase] = useState('idle'); // idle | player | done
  const [roundBet, setRoundBet] = useState(0);
  const [message, setMessage] = useState(null); // { text, color }
  const [history, setHistory] = useState([]);

  const cappedBet = Math.min(bet, maxBet);
  const pTotal = handTotal(player);
  const dTotal = handTotal(dealer);

  // Auszahlung: Basis-Multiplikator (2 = 1:1, 2.5 = 3:2) – Bonus wirkt auf den Gewinnanteil
  const settle = (outcome, stake, pCards, dCards) => {
    let text; let color; let profit = 0;
    if (outcome === 'blackjack') {
      profit = parseFloat((stake * 1.5 * ePMult * wMult).toFixed(2));
      text = `🃏 BLACKJACK! +${profit}€`; color = '#f59e0b';
    } else if (outcome === 'win') {
      profit = parseFloat((stake * ePMult * wMult).toFixed(2));
      text = `🎉 Gewonnen! +${profit}€`; color = '#00e701';
    } else if (outcome === 'push') {
      text = '🤝 Unentschieden – Einsatz zurück'; color = '#94a3b8';
    } else {
      text = outcome === 'bust' ? `💥 Bust! -${stake}€` : `😢 Dealer gewinnt -${stake}€`; color = '#ff4444';
    }

    if (outcome === 'blackjack' || outcome === 'win') {
      setBalance(prev => parseFloat((prev + stake + profit).toFixed(2)));
      addResult(true, profit, 'blackjack', stake, parseFloat(((outcome === 'blackjack' ? 2.5 : 2) * ePMult * wMult).toFixed(4)));
    } else if (outcome === 'push') {
      setBalance(prev => parseFloat((prev + stake).toFixed(2)));
    } else {
      addResult(false, stake, 'blackjack', stake, 1);
    }

    setMessage({ text, color });
    setPhase('done');
    setHistory(prev => [{ outcome, p: handTotal(pCards).total, d: handTotal(dCards).total }, ...prev].slice(0, 12));
  };

  const deal = () => {
    if (cappedBet > balance || cappedBet <= 0) return;
    setBalance(prev => parseFloat((prev - cappedBet).toFixed(2)));
    const p = [drawCard(), drawCard()];
    const d = [drawCard(), drawCard()];
    setPlayer(p);
    setDealer(d);
    setRoundBet(cappedBet);
    setMessage(null);

    const pBJ = isBlackjack(p);
    const dBJ = isBlackjack(d);
    if (pBJ || dBJ) {
      settle(pBJ && dBJ ? 'push' : pBJ ? 'blackjack' : 'lose', cappedBet, p, d);
    } else {
      setPhase('player');
    }
  };

  const dealerPlay = (pCards, stake) => {
    const d = [...dealer];
    // Dealer steht auf allen 17 (auch soft 17)
    while (handTotal(d).total < 17) d.push(drawCard());
    setDealer(d);
    const pt = handTotal(pCards).total;
    const dt = handTotal(d).total;
    settle(dt > 21 || pt > dt ? 'win' : pt === dt ? 'push' : 'lose', stake, pCards, d);
  };

  const hit = () => {
    const p = [...player, drawCard()];
    setPlayer(p);
    const t = handTotal(p).total;
    if (t > 21) settle('bust', roundBet, p, dealer);
    else if (t === 21) dealerPlay(p, roundBet);
  };

  const stand = () => dealerPlay(player, roundBet);

  const canDouble = phase === 'player' && player.length === 2 && balance >= roundBet;
  const doubleDown = () => {
    if (!canDouble) return;
    setBalance(prev => parseFloat((prev - roundBet).toFixed(2)));
    const stake = roundBet * 2;
    setRoundBet(stake);
    const p = [...player, drawCard()];
    setPlayer(p);
    if (handTotal(p).total > 21) settle('bust', stake, p, dealer);
    else dealerPlay(p, stake);
  };

  const btn = (bg, enabled) => ({
    flex: 1, padding: '14px', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 'bold',
    background: enabled ? bg : '#2d4a5a', color: enabled ? '#0f1923' : '#64748b',
    cursor: enabled ? 'pointer' : 'not-allowed',
  });

  const hideHole = phase === 'player';
  const shownDealerTotal = hideHole ? handTotal([dealer[0]]).total : dTotal.total;

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '30px', boxSizing: 'border-box', flexWrap: 'wrap' }}>

      {/* Left Panel */}
      <div style={{ width: '220px', backgroundColor: '#1a2c38', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0 }}>
        <div>
          <label style={{ color: '#8a9bb0', fontSize: '12px', display: 'block', marginBottom: '6px' }}>EINSATZ</label>
          <div style={{ position: 'relative' }}>
            <input type="number" value={bet} disabled={phase === 'player'}
              onChange={e => setBet(Math.min(parseFloat(e.target.value) || 0, maxBet))}
              style={{ width: '100%', padding: '10px', paddingRight: '60px', backgroundColor: '#0f1923', border: '1px solid #2d4a5a', color: 'white', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
            <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px' }}>
              <button disabled={phase === 'player'} onClick={() => setBet(prev => parseFloat((prev / 2).toFixed(2)))}
                style={{ backgroundColor: '#2d4a5a', border: 'none', color: '#8a9bb0', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '12px' }}>½</button>
              <button disabled={phase === 'player'} onClick={() => setBet(prev => Math.min(parseFloat((prev * 2).toFixed(2)), maxBet))}
                style={{ backgroundColor: '#2d4a5a', border: 'none', color: '#8a9bb0', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '12px' }}>2x</button>
            </div>
          </div>
        </div>

        <div style={{ background: '#0f1923', border: '1px solid #2d4a5a', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8a9bb0' }}>Sieg</span><span style={{ fontWeight: 'bold' }}>1:1</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8a9bb0' }}>Blackjack</span><span style={{ fontWeight: 'bold', color: '#f59e0b' }}>3:2</span>
          </div>
          {winBonus > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8a9bb0' }}>💰 Bonus</span><span style={{ color: '#34d399', fontWeight: 'bold' }}>×{wMult.toFixed(2)}</span>
            </div>
          )}
          {ePMult > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8a9bb0' }}>⭐ Prestige</span><span style={{ color: '#f59e0b', fontWeight: 'bold' }}>×{ePMult}</span>
            </div>
          )}
        </div>

        {bet > maxBet && (
          <div style={{ color: '#f59e0b', fontSize: '11px', textAlign: 'center' }}>Max Einsatz: {maxBet}€ (Upgrade nötig)</div>
        )}

        {phase !== 'player' ? (
          <button onClick={deal} disabled={cappedBet > balance || cappedBet <= 0} style={{ ...btn('#00e701', cappedBet <= balance && cappedBet > 0), flex: 'none', marginTop: 'auto' }}>
            🃏 {phase === 'done' ? 'Neue Runde' : 'Austeilen'}
          </button>
        ) : (
          <div style={{ marginTop: 'auto', color: '#8a9bb0', fontSize: 12, textAlign: 'center' }}>
            Einsatz im Spiel: <b style={{ color: 'white' }}>{roundBet}€</b>
          </div>
        )}

        {onUpgradeMaxbet && (
          <UpgradePanel gameId="blackjack" balance={balance} maxBetLevels={maxBetLevels} winrateLevels={winrateLevels}
            onUpgradeMaxbet={onUpgradeMaxbet} onUpgradeWinrate={onUpgradeWinrate} />
        )}
      </div>

      {/* Table */}
      <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          background: 'radial-gradient(ellipse at center, #14532d 0%, #0b3b1f 70%, #072613 100%)',
          border: '6px solid #5b3a1e', borderRadius: 24, padding: '28px', minHeight: 420,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5)',
        }}>
          {/* Dealer */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#bbf7d0', fontSize: 12, letterSpacing: 2, marginBottom: 8 }}>
              DEALER {dealer.length > 0 && <b style={{ color: 'white' }}>· {shownDealerTotal}{hideHole ? '+?' : ''}</b>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', minHeight: 104 }}>
              {dealer.map((c, i) => <Card key={c.id} card={c} index={i} hidden={hideHole && i === 1} />)}
            </div>
          </div>

          {/* Message */}
          <div style={{ minHeight: 40, fontSize: 22, fontWeight: 'bold', color: message?.color || '#bbf7d0', textAlign: 'center' }}>
            {message ? message.text : phase === 'idle' ? 'Setze deinen Einsatz' : ''}
          </div>

          {/* Player */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', minHeight: 104 }}>
              {player.map((c, i) => <Card key={c.id} card={c} index={i} />)}
            </div>
            <div style={{ color: '#bbf7d0', fontSize: 12, letterSpacing: 2, marginTop: 8 }}>
              DU {player.length > 0 && <b style={{ color: pTotal.total > 21 ? '#f87171' : 'white' }}>· {pTotal.total}{pTotal.soft && pTotal.total < 21 ? ' (soft)' : ''}</b>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={hit} disabled={phase !== 'player'} style={btn('#3b82f6', phase === 'player')}>👆 Hit</button>
          <button onClick={stand} disabled={phase !== 'player'} style={btn('#f59e0b', phase === 'player')}>✋ Stand</button>
          <button onClick={doubleDown} disabled={!canDouble} style={btn('#a78bfa', canDouble)}>✌️ Double</button>
        </div>

        {history.length > 0 && (
          <div style={{ backgroundColor: '#1a2c38', borderRadius: '12px', padding: '16px' }}>
            <div style={{ color: '#8a9bb0', fontSize: '12px', letterSpacing: '1px', marginBottom: '12px' }}>LETZTE HÄNDE</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {history.map((h, i) => {
                const good = h.outcome === 'win' || h.outcome === 'blackjack';
                const c = good ? '#00e701' : h.outcome === 'push' ? '#94a3b8' : '#ff4444';
                return (
                  <div key={i} style={{ padding: '6px 10px', borderRadius: 6, background: c + '22', border: `1px solid ${c}`, color: c, fontSize: 12, fontWeight: 'bold' }}>
                    {h.outcome === 'blackjack' ? 'BJ' : h.p} : {h.d}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Blackjack;
