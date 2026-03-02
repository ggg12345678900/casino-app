import React, { useState } from 'react';
import { api } from './api';
import {
  GAMES_META, MAX_BET_VALUES, maxBetCosts, winrateCosts,
  WINRATE_BONUS_PER_LEVEL, fmt,
} from './progression';

/**
 * UpgradePanel – shown as a collapsible panel in each game.
 *
 * Props:
 *   gameId          – e.g. 'dice'
 *   balance         – current balance
 *   maxBetLevels    – { dice: 2, ... }
 *   winrateLevels   – { dice: 1, ... }
 *   onUpgradeMaxbet – (game, newBalance, newLevels) => void
 *   onUpgradeWinrate – (game, newBalance, newLevels) => void
 */
export default function UpgradePanel({ gameId, balance, maxBetLevels, winrateLevels, onUpgradeMaxbet, onUpgradeWinrate }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(null);

  const meta = GAMES_META[gameId];
  const mbLevel = maxBetLevels?.[gameId] || 0;
  const wrLevel = winrateLevels?.[gameId] || 0;
  const mbCosts = maxBetCosts(gameId);   // array of 5 costs
  const wrCosts = winrateCosts(gameId);  // array of 5 costs
  const maxMbLevel = MAX_BET_VALUES.length - 1; // 5
  const maxWrLevel = 5;

  const handleMaxbet = async () => {
    if (mbLevel >= maxMbLevel) return;
    const cost = mbCosts[mbLevel];
    if (balance < cost) return;
    setLoading('mb');
    const res = await api.upgradeMaxbet(gameId);
    setLoading(null);
    if (res.error) { alert(res.error); return; }
    onUpgradeMaxbet(gameId, res.balance, JSON.parse(res.max_bet_levels));
  };

  const handleWinrate = async () => {
    if (wrLevel >= maxWrLevel) return;
    const cost = wrCosts[wrLevel];
    if (balance < cost) return;
    setLoading('wr');
    const res = await api.upgradeWinrate(gameId);
    setLoading(null);
    if (res.error) { alert(res.error); return; }
    onUpgradeWinrate(gameId, res.balance, JSON.parse(res.winrate_levels));
  };

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '8px 14px',
          background: open ? '#1a2c38' : 'transparent',
          border: `1px solid ${open ? meta.color + '66' : '#2d4a5a'}`,
          borderRadius: open ? '8px 8px 0 0' : 8,
          color: open ? meta.color : '#8a9bb0',
          fontSize: 13, fontWeight: 'bold', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
        <span>⬆️ Upgrades</span>
        <span style={{ fontSize: 11 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          background: '#1a2c38',
          border: `1px solid ${meta.color}33`,
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          padding: '14px',
        }}>

          {/* Max Bet Upgrade */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Max Einsatz
              </span>
              <span style={{ color: '#4ade80', fontSize: 13, fontWeight: 'bold' }}>
                {fmt(MAX_BET_VALUES[mbLevel])}€
              </span>
            </div>
            {/* Level pips */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {Array.from({ length: maxMbLevel }).map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 5, borderRadius: 3,
                  background: i < mbLevel ? '#4ade80' : '#2d4a5a',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
            {mbLevel < maxMbLevel ? (
              <button
                onClick={handleMaxbet}
                disabled={balance < mbCosts[mbLevel] || loading === 'mb'}
                style={{
                  width: '100%', padding: '8px',
                  background: balance >= mbCosts[mbLevel] ? '#22c55e' : '#2d4a5a',
                  border: 'none', borderRadius: 6,
                  color: balance >= mbCosts[mbLevel] ? '#0f1923' : '#475569',
                  fontSize: 12, fontWeight: 'bold',
                  cursor: balance >= mbCosts[mbLevel] ? 'pointer' : 'not-allowed',
                  opacity: loading === 'mb' ? 0.6 : 1,
                }}>
                {loading === 'mb'
                  ? '...'
                  : balance >= mbCosts[mbLevel]
                    ? `Upgrade → ${fmt(MAX_BET_VALUES[mbLevel + 1])}€  (-${fmt(mbCosts[mbLevel])}€)`
                    : `${fmt(mbCosts[mbLevel])}€ nötig`}
              </button>
            ) : (
              <div style={{ textAlign: 'center', color: '#4ade80', fontSize: 12, padding: '6px' }}>✅ Max Level erreicht!</div>
            )}
          </div>

          {/* Win Rate Upgrade */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Win Rate Bonus
              </span>
              <span style={{ color: '#f59e0b', fontSize: 13, fontWeight: 'bold' }}>
                +{(wrLevel * WINRATE_BONUS_PER_LEVEL * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {Array.from({ length: maxWrLevel }).map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 5, borderRadius: 3,
                  background: i < wrLevel ? '#f59e0b' : '#2d4a5a',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
            {wrLevel < maxWrLevel ? (
              <button
                onClick={handleWinrate}
                disabled={balance < wrCosts[wrLevel] || loading === 'wr'}
                style={{
                  width: '100%', padding: '8px',
                  background: balance >= wrCosts[wrLevel] ? '#f59e0b' : '#2d4a5a',
                  border: 'none', borderRadius: 6,
                  color: balance >= wrCosts[wrLevel] ? '#0f1923' : '#475569',
                  fontSize: 12, fontWeight: 'bold',
                  cursor: balance >= wrCosts[wrLevel] ? 'pointer' : 'not-allowed',
                  opacity: loading === 'wr' ? 0.6 : 1,
                }}>
                {loading === 'wr'
                  ? '...'
                  : balance >= wrCosts[wrLevel]
                    ? `Upgrade → +${((wrLevel + 1) * WINRATE_BONUS_PER_LEVEL * 100).toFixed(0)}%  (-${fmt(wrCosts[wrLevel])}€)`
                    : `${fmt(wrCosts[wrLevel])}€ nötig`}
              </button>
            ) : (
              <div style={{ textAlign: 'center', color: '#f59e0b', fontSize: 12, padding: '6px' }}>✅ Max Level erreicht!</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
