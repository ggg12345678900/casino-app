import React, { useState, useEffect, useCallback } from 'react';
import Dice from './Dice';
import Mines from './Mines';
import Crash from './Crash';
import Plinko from './Plinko';
import Login from './Login';
import AdminPanel from './AdminPanel';
import SideMenu from './SideMenu';
import { api } from './api';
import Roulette from './Roulette';
import Chicken from './Chicken';
import Pump from './Pump';
import Lobby from './Lobby';
import { GAMES_META, MAX_BET_VALUES, maxBetCosts, winrateCosts, WINRATE_BONUS_PER_LEVEL, prestigeMult } from './progression';


const GAMES = [
  { id: 'dice', name: 'Dice', icon: '🎲' },
  { id: 'mines', name: 'Mines', icon: '💣' },
  { id: 'crash', name: 'Crash', icon: '🚀' },
  { id: 'plinko', name: 'Plinko', icon: '🎯' },
  { id: 'roulette', name: 'Roulette', icon: '🎡' },
  { id: 'chicken', name: 'Chicken', icon: '🐔' },
  { id: 'pump', name: 'Pump', icon: '🎈' },
  { id: 'blackjack', name: 'Blackjack', icon: '🃏' },
];

function ComingSoon({ name, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '16px', color: '#8a9bb0' }}>
      <div style={{ fontSize: '80px' }}>{icon}</div>
      <h2 style={{ margin: 0, fontSize: '28px', color: 'white' }}>{name}</h2>
      <p style={{ margin: 0, fontSize: '16px' }}>Kommt bald... 🚧</p>
    </div>
  );
}

function MiniGraph({ history }) {
  if (history.length < 2) return (
    <div style={{ color: '#8a9bb0', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Noch keine Daten...</div>
  );

  const max = Math.max(...history.map(h => Math.abs(h)), 1);
  const width = 300; const height = 100;
  const step = width / (history.length - 1);
  const zeroY = height / 2;
  const toY = (val) => zeroY - (val / max) * (zeroY - 10);
  const points = history.map((val, i) => ({ x: i * step, y: toY(val), val }));
  const segments = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]; const p2 = points[i + 1];
    if (p1.val >= 0 && p2.val >= 0) {
      segments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, color: '#00e701' });
    } else if (p1.val < 0 && p2.val < 0) {
      segments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, color: '#ff4444' });
    } else {
      const ratio = Math.abs(p1.val) / (Math.abs(p1.val) + Math.abs(p2.val));
      const crossX = p1.x + ratio * (p2.x - p1.x);
      if (p1.val >= 0) {
        segments.push({ x1: p1.x, y1: p1.y, x2: crossX, y2: zeroY, color: '#00e701' });
        segments.push({ x1: crossX, y1: zeroY, x2: p2.x, y2: p2.y, color: '#ff4444' });
      } else {
        segments.push({ x1: p1.x, y1: p1.y, x2: crossX, y2: zeroY, color: '#ff4444' });
        segments.push({ x1: crossX, y1: zeroY, x2: p2.x, y2: p2.y, color: '#00e701' });
      }
    }
  }

  const last = points[points.length - 1];
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ borderRadius: '8px', backgroundColor: '#0f1923' }}>
      <line x1="0" y1={zeroY} x2={width} y2={zeroY} stroke="#ffffff" strokeWidth="1" strokeDasharray="4" />
      {segments.map((seg, i) => (
        <line key={i} x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} stroke={seg.color} strokeWidth="2.5" strokeLinecap="round" />
      ))}
      <circle cx={last.x} cy={last.y} r="4" fill={last.val >= 0 ? '#00e701' : '#ff4444'} />
    </svg>
  );
}

function StatRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #2d4a5a' }}>
      <span style={{ color: '#8a9bb0', fontSize: '14px' }}>{label}</span>
      <span style={{ color: color || 'white', fontSize: '15px', fontWeight: 'bold' }}>{value}</span>
    </div>
  );
}

// Parse progression fields from profile data
function parseProgression(data) {
  let unlockedGames = ['dice'];
  let maxBetLevels = {};
  let winrateLevels = {};
  try { unlockedGames = JSON.parse(data.unlocked_games || '["dice"]'); } catch {}
  try { maxBetLevels = JSON.parse(data.max_bet_levels || '{}'); } catch {}
  try { winrateLevels = JSON.parse(data.winrate_levels || '{}'); } catch {}
  return { unlockedGames, maxBetLevels, winrateLevels, prestigeCount: data.prestige_count || 0 };
}

function App() {
  const [user, setUser] = useState(null);
  const [balance, setBalanceState] = useState(1000);
  const [activeGame, setActiveGame] = useState(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState({ totalBets: 0, wins: 0, losses: 0, totalWon: 0, totalLost: 0, biggestWin: 0, history: [0] });

  // Idle game progression state
  const [unlockedGames, setUnlockedGames] = useState(['dice']);
  const [maxBetLevels, setMaxBetLevels] = useState({});   // { dice: 2, mines: 0, ... }
  const [winrateLevels, setWinrateLevels] = useState({}); // { dice: 1, ... }
  const [prestigeCount, setPrestigeCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.profile().then(data => {
        if (!data.error) {
          setUser(data);
          setBalanceState(data.balance);
          const prog = parseProgression(data);
          setUnlockedGames(prog.unlockedGames);
          setMaxBetLevels(prog.maxBetLevels);
          setWinrateLevels(prog.winrateLevels);
          setPrestigeCount(prog.prestigeCount);
        } else {
          localStorage.removeItem('token');
        }
      });
    }
  }, []);

  const setBalance = (newBalanceOrFn) => {
    setBalanceState(prev => {
      const newBalance = typeof newBalanceOrFn === 'function' ? newBalanceOrFn(prev) : newBalanceOrFn;
      return newBalance;
    });
  };

  // Progression helpers – called after successful API responses
  const handleUnlockGame = useCallback((game, newBalance, newUnlocked) => {
    setBalanceState(newBalance);
    setUnlockedGames(newUnlocked);
  }, []);

  const handleUpgradeMaxbet = useCallback((game, newBalance, newLevels) => {
    setBalanceState(newBalance);
    setMaxBetLevels(newLevels);
  }, []);

  const handleUpgradeWinrate = useCallback((game, newBalance, newLevels) => {
    setBalanceState(newBalance);
    setWinrateLevels(newLevels);
  }, []);

  const handlePrestige = useCallback((newPrestigeCount) => {
    setPrestigeCount(newPrestigeCount);
    setUnlockedGames(['dice']);
    setMaxBetLevels({});
    setWinrateLevels({});
    setBalanceState(1000);
    setActiveGame(null);
  }, []);

  // Derived per-game props
  const getGameProps = useCallback((gameId) => {
    const mbLevel = maxBetLevels[gameId] || 0;
    const wrLevel = winrateLevels[gameId] || 0;
    const pMult = prestigeMult(prestigeCount);
    return {
      maxBet: MAX_BET_VALUES[mbLevel],
      winBonus: wrLevel * WINRATE_BONUS_PER_LEVEL,
      prestigeMult: pMult,
      maxBetLevels,
      winrateLevels,
      onUpgradeMaxbet: handleUpgradeMaxbet,
      onUpgradeWinrate: handleUpgradeWinrate,
    };
  }, [maxBetLevels, winrateLevels, prestigeCount, handleUpgradeMaxbet, handleUpgradeWinrate]);

  const addResult = (didWin, profitAmount, game, bet, multiplier) => {
    setBalanceState(prev => {
      const newBalance = prev;
      if (user) {
        api.updateStats(didWin, profitAmount, newBalance, game, bet, multiplier);
      }
      return prev;
    });

    setStats(prev => {
      const lastNet = prev.history[prev.history.length - 1];
      const newNet = didWin
        ? parseFloat((lastNet + profitAmount).toFixed(2))
        : parseFloat((lastNet - profitAmount).toFixed(2));
      return {
        totalBets: prev.totalBets + 1,
        wins: didWin ? prev.wins + 1 : prev.wins,
        losses: didWin ? prev.losses : prev.losses + 1,
        totalWon: didWin ? parseFloat((prev.totalWon + profitAmount).toFixed(2)) : prev.totalWon,
        totalLost: didWin ? prev.totalLost : parseFloat((prev.totalLost + profitAmount).toFixed(2)),
        biggestWin: didWin && profitAmount > prev.biggestWin ? parseFloat(profitAmount.toFixed(2)) : prev.biggestWin,
        history: [...prev.history, newNet],
      };
    });
  };

  const handleLogin = (data) => {
    setUser(data);
    setBalanceState(data.balance);
    const prog = parseProgression(data);
    setUnlockedGames(prog.unlockedGames);
    setMaxBetLevels(prog.maxBetLevels);
    setWinrateLevels(prog.winrateLevels);
    setPrestigeCount(prog.prestigeCount);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setBalanceState(1000);
    setStats({ totalBets: 0, wins: 0, losses: 0, totalWon: 0, totalLost: 0, biggestWin: 0, history: [0] });
    setUnlockedGames(['dice']);
    setMaxBetLevels({});
    setWinrateLevels({});
    setPrestigeCount(0);
  };

  if (!user) return <Login onLogin={handleLogin} />;

  const netProfit = stats.history[stats.history.length - 1];
  const winrate = stats.totalBets > 0 ? ((stats.wins / stats.totalBets) * 100).toFixed(1) : '0.0';

  const renderGame = () => {
    const progression = {
      unlockedGames,
      maxBetLevels,
      winrateLevels,
      prestigeCount,
      onUnlockGame: handleUnlockGame,
      onUpgradeMaxbet: handleUpgradeMaxbet,
      onUpgradeWinrate: handleUpgradeWinrate,
      onPrestige: handlePrestige,
    };
    switch (activeGame) {
      case null: return <Lobby user={user} balance={balance} stats={stats} onGameSelect={setActiveGame} progression={progression} />;
      case 'dice': return <Dice balance={balance} setBalance={setBalance} addResult={addResult} {...getGameProps('dice')} />;
      case 'mines': return <Mines balance={balance} setBalance={setBalance} addResult={addResult} {...getGameProps('mines')} />;
      case 'crash': return <Crash balance={balance} setBalance={setBalance} addResult={addResult} {...getGameProps('crash')} />;
      case 'plinko': return <Plinko balance={balance} setBalance={setBalance} addResult={addResult} {...getGameProps('plinko')} />;
      case 'roulette': return <Roulette balance={balance} setBalance={setBalance} addResult={addResult} {...getGameProps('roulette')} />;
      case 'chicken': return <Chicken balance={balance} setBalance={setBalance} addResult={addResult} {...getGameProps('chicken')} />;
      case 'pump': return <Pump balance={balance} setBalance={setBalance} addResult={addResult} user={user} setUser={setUser} {...getGameProps('pump')} />;
      default: return <ComingSoon name={GAMES.find(g => g.id === activeGame)?.name} icon={GAMES.find(g => g.id === activeGame)?.icon} />;
    }
  };

  return (
    <div style={{ backgroundColor: '#0f1923', minHeight: '100vh', color: 'white', fontFamily: "'Segoe UI', sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ backgroundColor: '#1a2c38', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2d4a5a', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setMenuOpen(true)}
            style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>🎰</span>
            <span style={{ color: '#00e701', fontWeight: 'bold', fontSize: '20px', letterSpacing: '1px' }}>CasinoSim</span>
            <span style={{ color: '#8a9bb0', fontSize: '16px' }}>☰</span>
          </button>
          {activeGame !== null && (
            <button onClick={() => setActiveGame(null)}
              style={{ backgroundColor: 'transparent', border: '1px solid #2d4a5a', color: '#8a9bb0', borderRadius: '8px', padding: '5px 12px', cursor: 'pointer', fontSize: '13px' }}>
              ← Lobby
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {(user.is_admin === 1 || user.is_admin === true) && (
            <button onClick={() => setAdminOpen(true)}
              style={{ padding: '7px 14px', backgroundColor: '#f5a62322', border: '1px solid #f5a623', color: '#f5a623', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
              👑 Admin
            </button>
          )}
          <button onClick={() => setStatsOpen(o => !o)}
            style={{ padding: '7px 14px', backgroundColor: statsOpen ? '#2d4a5a' : '#1a2c38', border: '1px solid #2d4a5a', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
            📊 Statistik
          </button>
          <div style={{ backgroundColor: '#2d4a5a', padding: '7px 16px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold' }}>
            💰 {balance.toFixed(2)}€
          </div>
          <div style={{ color: '#8a9bb0', fontSize: '13px' }}>👤 {user.username}</div>
          <button onClick={handleLogout}
            style={{ padding: '7px 14px', backgroundColor: 'transparent', border: '1px solid #ff4444', color: '#ff4444', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 57px)' }}>


        {/* Main */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', transition: 'margin-right 0.3s', marginRight: statsOpen ? '300px' : '0' }}>
          {renderGame()}
        </div>

        {/* Stats Sidebar */}
        <div style={{
          position: 'absolute', right: 0, top: 57, bottom: 0, width: '300px',
          backgroundColor: '#1a2c38', borderLeft: '1px solid #2d4a5a',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
          transform: statsOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease', overflowY: 'auto', zIndex: 50,
          padding: '24px', boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '18px' }}>📊 Meine Statistik</h2>
            <button onClick={() => setStatsOpen(false)} style={{ backgroundColor: 'transparent', border: 'none', color: '#8a9bb0', fontSize: '20px', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ color: '#8a9bb0', fontSize: '12px', marginBottom: '8px', letterSpacing: '1px' }}>NET PROFIT VERLAUF</div>
            <MiniGraph history={stats.history} />
            <div style={{ textAlign: 'right', marginTop: '6px', fontSize: '18px', fontWeight: 'bold', color: netProfit >= 0 ? '#00e701' : '#ff4444' }}>
              {netProfit >= 0 ? '+' : ''}{netProfit}€
            </div>
          </div>
          <StatRow label="Gesamte Einsätze" value={stats.totalBets} />
          <StatRow label="Gewonnen" value={stats.wins} color="#00e701" />
          <StatRow label="Verloren" value={stats.losses} color="#ff4444" />
          <StatRow label="Winrate" value={`${winrate}%`} color={parseFloat(winrate) >= 50 ? '#00e701' : '#ff4444'} />
          <StatRow label="Total gewonnen" value={`+${stats.totalWon}€`} color="#00e701" />
          <StatRow label="Total verloren" value={`-${stats.totalLost}€`} color="#ff4444" />
          <StatRow label="Größter Gewinn" value={`+${stats.biggestWin}€`} color="#f5a623" />
          <button onClick={() => setStats({ totalBets: 0, wins: 0, losses: 0, totalWon: 0, totalLost: 0, biggestWin: 0, history: [0] })}
            style={{ marginTop: '20px', width: '100%', padding: '10px', backgroundColor: 'transparent', border: '1px solid #ff4444', color: '#ff4444', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
            🔄 Statistik zurücksetzen
          </button>
        </div>
      </div>

      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} currentUser={user} />}
      <SideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        user={user}
        balance={balance}
        onGameSelect={setActiveGame}
        onBalanceUpdate={setBalanceState}
      />
    </div>
  );
}

export default App;