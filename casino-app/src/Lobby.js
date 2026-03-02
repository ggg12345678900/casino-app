import React, { useState, useEffect } from 'react';
import { api } from './api';
import {
  GAME_ORDER, GAMES_META,
  MAX_BET_VALUES, maxBetCosts, winrateCosts,
  prestigeCost, prestigeMult, PRESTIGE_GAMES_REQ, fmt,
} from './progression';

const GAME_DESCS = {
  dice:     'Roll über oder unter',
  mines:    'Vermeide die Minen',
  plinko:   'Lass den Ball fallen',
  crash:    'Cash out bevor es crasht',
  roulette: 'Zahlen, Farben, Chancen',
  chicken:  'Überquere die Straße',
  pump:     'Pump den Ballon – cash out!',
};

const GAME_GRADIENT = {
  dice:     'linear-gradient(135deg, #1e3a5f 0%, #1a2c38 100%)',
  mines:    'linear-gradient(135deg, #5f1e1e 0%, #1a2c38 100%)',
  plinko:   'linear-gradient(135deg, #3a1e5f 0%, #1a2c38 100%)',
  crash:    'linear-gradient(135deg, #5f3a1e 0%, #1a2c38 100%)',
  roulette: 'linear-gradient(135deg, #5f1e3a 0%, #1a2c38 100%)',
  chicken:  'linear-gradient(135deg, #1e5f2a 0%, #1a2c38 100%)',
  pump:     'linear-gradient(135deg, #0e3a4f 0%, #1a2c38 100%)',
};

export default function Lobby({ user, balance, stats, onGameSelect, progression }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [loading, setLoading] = useState(null); // which action is loading

  const {
    unlockedGames = ['dice'],
    maxBetLevels = {},
    winrateLevels = {},
    prestigeCount = 0,
    onUnlockGame,
    onUpgradeMaxbet,
    onUpgradeWinrate,
    onPrestige,
  } = progression || {};

  useEffect(() => {
    api.leaderboard().then(data => {
      if (Array.isArray(data)) setLeaderboard(data.slice(0, 5));
    });
  }, []);

  // Cycle featured among UNLOCKED games
  useEffect(() => {
    const id = setInterval(() => setFeaturedIdx(i => (i + 1) % unlockedGames.length), 5000);
    return () => clearInterval(id);
  }, [unlockedGames.length]);

  const winrate = stats.totalBets > 0
    ? ((stats.wins / stats.totalBets) * 100).toFixed(0)
    : 0;

  const featuredId = unlockedGames[featuredIdx % unlockedGames.length] || 'dice';
  const featuredMeta = GAMES_META[featuredId];

  // Prestige info
  const nextPrestigeCost = prestigeCost(prestigeCount);
  const prestigeProgress = Math.min(balance / nextPrestigeCost, 1);
  const canPrestige = unlockedGames.length >= PRESTIGE_GAMES_REQ && balance >= nextPrestigeCost;

  const handleUnlock = async (gameId) => {
    setLoading('unlock_' + gameId);
    const res = await api.unlockGame(gameId);
    setLoading(null);
    if (res.error) { alert(res.error); return; }
    const newUnlocked = JSON.parse(res.unlocked_games);
    onUnlockGame(gameId, res.balance, newUnlocked);
  };

  const handlePrestige = async () => {
    if (!canPrestige) return;
    if (!window.confirm(`Prestige ${prestigeCount + 1}?\n\nAlles wird zurückgesetzt außer Prestige-Count.\nDu bekommst ${prestigeMult(prestigeCount + 1)}x Gewinn-Multiplikator.`)) return;
    setLoading('prestige');
    const res = await api.prestige();
    setLoading(null);
    if (res.error) { alert(res.error); return; }
    onPrestige(res.prestige_count);
  };

  return (
    <div style={{ background: '#0f1923', minHeight: '100%', color: '#f1f5f9', fontFamily: "'Segoe UI', sans-serif", overflowY: 'auto' }}>

      {/* Welcome bar */}
      <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 'bold' }}>
            Hey, {user?.username}! 👋
            {prestigeCount > 0 && (
              <span style={{ marginLeft: 10, fontSize: 14, color: '#f59e0b', fontWeight: 'bold' }}>
                ⭐ Prestige {prestigeCount} ({prestigeMult(prestigeCount)}x)
              </span>
            )}
          </div>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>Bereit zum Spielen?</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: 22 }}>💰 {balance.toFixed(2)}€</div>
          <div style={{ color: '#64748b', fontSize: 12 }}>Guthaben</div>
        </div>
      </div>

      {/* ── Prestige Bar ──────────────────────────────────────────── */}
      <div style={{ padding: '16px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            ⭐ Prestige {prestigeCount + 1}
          </span>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>
            {fmt(balance)} / {fmt(nextPrestigeCost)}€
            {unlockedGames.length < PRESTIGE_GAMES_REQ && (
              <span style={{ color: '#64748b', marginLeft: 8 }}>
                (noch {PRESTIGE_GAMES_REQ - unlockedGames.length} Spiel{PRESTIGE_GAMES_REQ - unlockedGames.length !== 1 ? 'e' : ''} freischalten)
              </span>
            )}
          </span>
        </div>
        <div style={{ background: '#1a2c38', borderRadius: 6, height: 8, overflow: 'hidden', border: '1px solid #2d4a5a' }}>
          <div style={{
            height: '100%',
            width: `${prestigeProgress * 100}%`,
            background: canPrestige ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #475569, #64748b)',
            borderRadius: 6,
            transition: 'width 0.5s ease',
          }} />
        </div>
        {canPrestige && (
          <button
            onClick={handlePrestige}
            disabled={loading === 'prestige'}
            style={{
              marginTop: 10, width: '100%', padding: '10px',
              background: 'linear-gradient(90deg, #f59e0b, #d97706)',
              border: 'none', borderRadius: 8, color: '#0f1923',
              fontWeight: 'bold', fontSize: 14, cursor: 'pointer',
              opacity: loading === 'prestige' ? 0.7 : 1,
            }}>
            {loading === 'prestige' ? '...' : `⭐ Prestige! (Reset + ${prestigeMult(prestigeCount + 1)}x Multiplikator)`}
          </button>
        )}
      </div>

      {/* ── Featured Banner ─────────────────────────────────────── */}
      <div style={{ padding: '20px 24px' }}>
        <div
          onClick={() => onGameSelect(featuredId)}
          style={{
            background: GAME_GRADIENT[featuredId],
            border: `1px solid ${featuredMeta.color}44`,
            borderRadius: 16, padding: '28px',
            cursor: 'pointer', position: 'relative', overflow: 'hidden',
            transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: `0 8px 32px ${featuredMeta.color}22`,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 12px 40px ${featuredMeta.color}33`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 8px 32px ${featuredMeta.color}22`; }}
        >
          <div style={{ position: 'absolute', right: -20, top: -20, width: 180, height: 180, background: `radial-gradient(circle, ${featuredMeta.color}25 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ fontSize: 64, lineHeight: 1, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}>{featuredMeta.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 26, fontWeight: 'bold', letterSpacing: '0.04em' }}>{featuredMeta.name}</div>
              <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>{GAME_DESCS[featuredId]}</div>
            </div>
            <div style={{ background: featuredMeta.color, color: '#0f1923', fontWeight: 'bold', fontSize: 14, padding: '12px 24px', borderRadius: 10, letterSpacing: '0.04em', flexShrink: 0 }}>
              Spielen →
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 18 }}>
            {unlockedGames.map((_, i) => (
              <div key={i} onClick={e => { e.stopPropagation(); setFeaturedIdx(i); }}
                style={{ width: i === featuredIdx ? 18 : 6, height: 6, borderRadius: 3, background: i === featuredIdx ? featuredMeta.color : '#334155', transition: 'all 0.3s', cursor: 'pointer' }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats Row ────────────────────────────────────────────── */}
      {stats.totalBets > 0 && (
        <div style={{ padding: '0 24px 20px' }}>
          <div style={{ color: '#475569', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Deine Session</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'Spiele', value: stats.totalBets, color: '#f8fafc' },
              { label: 'Winrate', value: `${winrate}%`, color: parseInt(winrate) >= 50 ? '#4ade80' : '#f87171' },
              { label: 'Net', value: `${stats.history[stats.history.length - 1] >= 0 ? '+' : ''}${stats.history[stats.history.length - 1]}€`, color: stats.history[stats.history.length - 1] >= 0 ? '#4ade80' : '#f87171' },
              { label: 'Bester', value: `+${stats.biggestWin}€`, color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, background: '#1a2c38', borderRadius: 10, padding: '12px', border: '1px solid #2d4a5a', textAlign: 'center' }}>
                <div style={{ color: s.color, fontWeight: 'bold', fontSize: 15 }}>{s.value}</div>
                <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── All Games ────────────────────────────────────────────── */}
      <div style={{ padding: '0 24px 20px' }}>
        <div style={{ color: '#475569', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Alle Spiele</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {GAME_ORDER.map(gameId => {
            const meta = GAMES_META[gameId];
            const isUnlocked = unlockedGames.includes(gameId);
            const needsPrestige = meta.prestigeReq > prestigeCount;
            const canAfford = balance >= meta.cost;

            return (
              <div key={gameId} style={{ position: 'relative' }}>
                <button
                  onClick={() => isUnlocked ? onGameSelect(gameId) : null}
                  style={{
                    width: '100%',
                    background: isUnlocked ? '#1a2c38' : '#131e28',
                    border: `1px solid ${isUnlocked ? '#2d4a5a' : '#1a2c38'}`,
                    borderRadius: 12, padding: '18px 12px',
                    cursor: isUnlocked ? 'pointer' : 'default',
                    textAlign: 'center',
                    transition: 'all 0.15s',
                    color: isUnlocked ? '#f8fafc' : '#475569',
                    opacity: isUnlocked ? 1 : 0.7,
                  }}
                  onMouseEnter={e => {
                    if (!isUnlocked) return;
                    e.currentTarget.style.background = GAME_GRADIENT[gameId];
                    e.currentTarget.style.borderColor = `${meta.color}66`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    if (!isUnlocked) return;
                    e.currentTarget.style.background = '#1a2c38';
                    e.currentTarget.style.borderColor = '#2d4a5a';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8, filter: isUnlocked ? 'none' : 'grayscale(1)' }}>
                    {isUnlocked ? meta.icon : '🔒'}
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: 13 }}>{meta.name}</div>
                  {isUnlocked ? (
                    <div style={{ color: '#64748b', fontSize: 11, marginTop: 3 }}>{GAME_DESCS[gameId]}</div>
                  ) : needsPrestige ? (
                    <div style={{ color: '#f59e0b', fontSize: 11, marginTop: 3 }}>Prestige {meta.prestigeReq} nötig</div>
                  ) : (
                    <div style={{ color: canAfford ? '#4ade80' : '#f87171', fontSize: 11, marginTop: 3, fontWeight: 'bold' }}>
                      {fmt(meta.cost)}€
                    </div>
                  )}
                </button>

                {/* Unlock button below card */}
                {!isUnlocked && !needsPrestige && (
                  <button
                    onClick={() => handleUnlock(gameId)}
                    disabled={!canAfford || loading === 'unlock_' + gameId}
                    style={{
                      marginTop: 4, width: '100%', padding: '6px',
                      background: canAfford ? meta.color : '#2d4a5a',
                      border: 'none', borderRadius: 8,
                      color: canAfford ? '#0f1923' : '#475569',
                      fontSize: 11, fontWeight: 'bold', cursor: canAfford ? 'pointer' : 'not-allowed',
                      opacity: loading === 'unlock_' + gameId ? 0.6 : 1,
                    }}>
                    {loading === 'unlock_' + gameId ? '...' : canAfford ? `Freischalten` : `${fmt(meta.cost - balance)}€ fehlen`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Leaderboard ──────────────────────────────────────────── */}
      {leaderboard.length > 0 && (
        <div style={{ padding: '0 24px 32px' }}>
          <div style={{ color: '#475569', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Top Spieler</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {leaderboard.map((u, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: '#1a2c38',
                border: `1px solid ${i === 0 ? '#f59e0b44' : i === 1 ? '#94a3b844' : i === 2 ? '#cd7f3244' : '#2d4a5a'}`,
                borderRadius: 10, padding: '12px 16px',
              }}>
                <span style={{ fontSize: 18, width: 28, textAlign: 'center' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: 14, color: u.username === user?.username ? '#4ade80' : '#f8fafc' }}>
                    {u.username}
                    {u.username === user?.username && <span style={{ color: '#64748b', fontWeight: 'normal', fontSize: 11, marginLeft: 6 }}>(du)</span>}
                  </div>
                  <div style={{ color: '#475569', fontSize: 11 }}>{u.total_bets} Spiele</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#4ade80', fontWeight: 'bold' }}>{u.balance.toFixed(0)}€</div>
                  <div style={{ color: '#f59e0b', fontSize: 11 }}>🏆 {u.biggest_win.toFixed(0)}€</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
