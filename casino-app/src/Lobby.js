import React, { useState, useEffect } from 'react';
import { api } from './api';

const GAMES = [
  { id: 'dice',     name: 'Dice',     icon: '🎲', desc: 'Roll über oder unter',        color: '#3b82f6', gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1a2c38 100%)' },
  { id: 'crash',    name: 'Crash',    icon: '🚀', desc: 'Cash out bevor es crasht',     color: '#f97316', gradient: 'linear-gradient(135deg, #5f3a1e 0%, #1a2c38 100%)' },
  { id: 'mines',    name: 'Mines',    icon: '💣', desc: 'Vermeide die Minen',            color: '#ef4444', gradient: 'linear-gradient(135deg, #5f1e1e 0%, #1a2c38 100%)' },
  { id: 'plinko',   name: 'Plinko',   icon: '🎯', desc: 'Lass den Ball fallen',          color: '#8b5cf6', gradient: 'linear-gradient(135deg, #3a1e5f 0%, #1a2c38 100%)' },
  { id: 'roulette', name: 'Roulette', icon: '🎡', desc: 'Zahlen, Farben, Chancen',      color: '#ec4899', gradient: 'linear-gradient(135deg, #5f1e3a 0%, #1a2c38 100%)' },
  { id: 'chicken',  name: 'Chicken',  icon: '🐔', desc: 'Überquere die Straße',          color: '#4ade80', gradient: 'linear-gradient(135deg, #1e5f2a 0%, #1a2c38 100%)', isNew: true },
];

const FEATURED_ID = 'chicken';

export default function Lobby({ user, balance, stats, onGameSelect }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [featuredIdx, setFeaturedIdx] = useState(GAMES.findIndex(g => g.id === FEATURED_ID));
  const featured = GAMES[featuredIdx];

  useEffect(() => {
    api.leaderboard().then(data => {
      if (Array.isArray(data)) setLeaderboard(data.slice(0, 5));
    });
  }, []);

  // Cycle featured game every 5s
  useEffect(() => {
    const id = setInterval(() => setFeaturedIdx(i => (i + 1) % GAMES.length), 5000);
    return () => clearInterval(id);
  }, []);

  const winrate = stats.totalBets > 0
    ? ((stats.wins / stats.totalBets) * 100).toFixed(0)
    : 0;

  return (
    <div style={{ background: '#0f1923', minHeight: '100%', color: '#f1f5f9', fontFamily: "'Segoe UI', sans-serif", overflowY: 'auto' }}>

      {/* Welcome bar */}
      <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 'bold' }}>
            Hey, {user?.username}! 👋
          </div>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
            Bereit zum Spielen?
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: 22 }}>
            💰 {balance.toFixed(2)}€
          </div>
          <div style={{ color: '#64748b', fontSize: 12 }}>Guthaben</div>
        </div>
      </div>

      {/* ── Featured Banner ─────────────────────────────────────── */}
      <div style={{ padding: '20px 24px' }}>
        <div
          onClick={() => onGameSelect(featured.id)}
          style={{
            background: featured.gradient,
            border: `1px solid ${featured.color}44`,
            borderRadius: 16,
            padding: '28px 28px',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: `0 8px 32px ${featured.color}22`,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 12px 40px ${featured.color}33`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 8px 32px ${featured.color}22`; }}
        >
          {/* Background glow */}
          <div style={{
            position: 'absolute', right: -20, top: -20,
            width: 180, height: 180,
            background: `radial-gradient(circle, ${featured.color}25 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />

          {featured.isNew && (
            <div style={{
              display: 'inline-block', background: featured.color, color: '#0f1923',
              fontSize: 10, fontWeight: 'bold', letterSpacing: '0.1em',
              padding: '3px 10px', borderRadius: 20, marginBottom: 12,
              textTransform: 'uppercase',
            }}>NEU</div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ fontSize: 64, lineHeight: 1, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}>
              {featured.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 26, fontWeight: 'bold', letterSpacing: '0.04em' }}>{featured.name}</div>
              <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>{featured.desc}</div>
            </div>
            <div style={{
              background: featured.color, color: '#0f1923',
              fontWeight: 'bold', fontSize: 14,
              padding: '12px 24px', borderRadius: 10,
              letterSpacing: '0.04em', flexShrink: 0,
            }}>
              Spielen →
            </div>
          </div>

          {/* Dot indicators */}
          <div style={{ display: 'flex', gap: 6, marginTop: 18 }}>
            {GAMES.map((_, i) => (
              <div
                key={i}
                onClick={e => { e.stopPropagation(); setFeaturedIdx(i); }}
                style={{
                  width: i === featuredIdx ? 18 : 6, height: 6,
                  borderRadius: 3,
                  background: i === featuredIdx ? featured.color : '#334155',
                  transition: 'all 0.3s', cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats Row ────────────────────────────────────────────── */}
      {stats.totalBets > 0 && (
        <div style={{ padding: '0 24px 20px' }}>
          <div style={{ color: '#475569', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Deine Session
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'Spiele', value: stats.totalBets, color: '#f8fafc' },
              { label: 'Winrate', value: `${winrate}%`, color: parseInt(winrate) >= 50 ? '#4ade80' : '#f87171' },
              { label: 'Net', value: `${stats.history[stats.history.length - 1] >= 0 ? '+' : ''}${stats.history[stats.history.length - 1]}€`, color: stats.history[stats.history.length - 1] >= 0 ? '#4ade80' : '#f87171' },
              { label: 'Bester', value: `+${stats.biggestWin}€`, color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, background: '#1a2c38', borderRadius: 10, padding: '12px',
                border: '1px solid #2d4a5a', textAlign: 'center',
              }}>
                <div style={{ color: s.color, fontWeight: 'bold', fontSize: 15 }}>{s.value}</div>
                <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── All Games ────────────────────────────────────────────── */}
      <div style={{ padding: '0 24px 20px' }}>
        <div style={{ color: '#475569', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
          Alle Spiele
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {GAMES.map(game => (
            <button
              key={game.id}
              onClick={() => onGameSelect(game.id)}
              style={{
                background: '#1a2c38',
                border: `1px solid #2d4a5a`,
                borderRadius: 12,
                padding: '18px 12px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s',
                position: 'relative',
                color: '#f8fafc',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = game.gradient;
                e.currentTarget.style.borderColor = `${game.color}66`;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#1a2c38';
                e.currentTarget.style.borderColor = '#2d4a5a';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {game.isNew && (
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  background: game.color, color: '#0f1923',
                  fontSize: 8, fontWeight: 'bold', letterSpacing: '0.08em',
                  padding: '2px 6px', borderRadius: 10, textTransform: 'uppercase',
                }}>NEU</div>
              )}
              <div style={{ fontSize: 32, marginBottom: 8 }}>{game.icon}</div>
              <div style={{ fontWeight: 'bold', fontSize: 13 }}>{game.name}</div>
              <div style={{ color: '#64748b', fontSize: 11, marginTop: 3 }}>{game.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Leaderboard ──────────────────────────────────────────── */}
      {leaderboard.length > 0 && (
        <div style={{ padding: '0 24px 32px' }}>
          <div style={{ color: '#475569', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Top Spieler
          </div>
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
