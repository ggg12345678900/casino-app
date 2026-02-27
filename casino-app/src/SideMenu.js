import React, { useState, useEffect } from 'react';
import { api } from './api';

const GAME_LIST = [
  { id: 'dice', name: 'Dice', icon: '🎲', desc: 'Roll über oder unter deinen Wert' },
  { id: 'mines', name: 'Mines', icon: '💣', desc: 'Vermeide die Minen und cash out' },
  { id: 'crash', name: 'Crash', icon: '🚀', desc: 'Cash out bevor es crasht' },
  { id: 'plinko', name: 'Plinko', icon: '🎯', desc: 'Lass den Ball fallen und gewinne' },
  { id: 'roulette', name: 'Roulette', icon: '🎡', desc: 'Setze auf Zahlen, Farben oder Gruppen' },
  { id: 'chicken', name: 'Chicken', icon: '🐔', desc: 'Überquere die Straße – hop für hop' },
  { id: 'pump', name: 'Pump', icon: '🎈', desc: 'Pumpe den Ballon – cash out rechtzeitig' },
  { id: 'blackjack', name: 'Blackjack', icon: '🃏', desc: 'Kommt bald...' },
];

function SideMenu({ open, onClose, user, balance, onGameSelect, onBalanceUpdate }) {
  const [tab, setTab] = useState('games');
  const [leaderboard, setLeaderboard] = useState([]);
  const [history, setHistory] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [, setDailyClaimed] = useState(false);
  const [dailyMsg, setDailyMsg] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [settings, setSettings] = useState({ animations: true, sounds: false });
  const [newUsername, setNewUsername] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleChangeUsername = async () => {
    if (!newUsername) return;
    const res = await api.changeUsername(newUsername);
    if (res.error) setDailyMsg('❌ ' + res.error);
    else {
      setDailyMsg('✅ Benutzername geändert! Bitte neu einloggen.');
      setNewUsername('');
      setTimeout(() => {
        localStorage.removeItem('token');
        window.location.reload();
      }, 2000);
    }
    setTimeout(() => setDailyMsg(''), 3000);
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) return;
    const res = await api.changePassword(oldPassword, newPassword);
    if (res.error) setDailyMsg('❌ ' + res.error);
    else {
      setDailyMsg('✅ Passwort geändert!');
      setOldPassword('');
      setNewPassword('');
    }
    setTimeout(() => setDailyMsg(''), 3000);
  };

  useEffect(() => {
    if (!open) return;
    if (tab === 'leaderboard') api.leaderboard().then(setLeaderboard);
    if (tab === 'history') api.history().then(setHistory);
    if (tab === 'challenges') api.challenges().then(setChallenges);
  }, [open, tab]);

  const handleDaily = async () => {
    const res = await api.daily();
    if (res.error) {
      setDailyMsg('❌ ' + res.error);
    } else {
      setDailyMsg(`✅ +${res.bonus}€ erhalten!`);
      onBalanceUpdate(res.newBalance);
      setDailyClaimed(true);
    }
    setTimeout(() => setDailyMsg(''), 3000);
  };

  const handleClaim = async (challengeId) => {
    const res = await api.claimChallenge(challengeId);
    if (res.success) {
      setDailyMsg(`✅ +${res.reward}€ Belohnung erhalten!`);
      onBalanceUpdate(balance + res.reward);
      api.challenges().then(setChallenges);
      setTimeout(() => setDailyMsg(''), 3000);
    }
  };

  const TABS = [
    { id: 'games', icon: '🎮', label: 'Spiele' },
    { id: 'leaderboard', icon: '🏆', label: 'Rangliste' },
    { id: 'history', icon: '📜', label: 'Verlauf' },
    { id: 'challenges', icon: '🎯', label: 'Challenges' },
    { id: 'settings', icon: '⚙️', label: 'Einstellungen' },
  ];

  return (
    <>
      {/* Overlay */}
      {open && (
        <div onClick={onClose} style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200
        }} />
      )}

      {/* Menu */}
      <div style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: '340px',
        backgroundColor: '#1a2c38', zIndex: 201,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 20px rgba(0,0,0,0.5)'
      }}>

        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #2d4a5a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>👤 {user?.username}</div>
            <div style={{ color: '#00e701', fontSize: '14px', marginTop: '2px' }}>💰 {balance?.toFixed(2)}€</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={handleDaily}
              style={{ padding: '8px 12px', backgroundColor: '#f5a62322', border: '1px solid #f5a623', color: '#f5a623', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
              🎁 Daily
            </button>
            <button onClick={onClose}
              style={{ backgroundColor: 'transparent', border: 'none', color: '#8a9bb0', fontSize: '22px', cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        {/* Daily Message */}
        {dailyMsg && (
          <div style={{ padding: '10px 20px', backgroundColor: dailyMsg.includes('✅') ? '#00e70122' : '#ff444422', color: dailyMsg.includes('✅') ? '#00e701' : '#ff4444', fontSize: '13px', textAlign: 'center' }}>
            {dailyMsg}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #2d4a5a', backgroundColor: '#0f1923' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer',
                backgroundColor: 'transparent',
                color: tab === t.id ? '#00e701' : '#8a9bb0',
                fontSize: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                borderBottom: tab === t.id ? '2px solid #00e701' : '2px solid transparent',
              }}>
              <span style={{ fontSize: '16px' }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

          {/* Games */}
          {tab === 'games' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ color: '#8a9bb0', fontSize: '11px', letterSpacing: '1px', marginBottom: '4px' }}>SPIELAUSWAHL</div>
              {GAME_LIST.map(game => (
                <button key={game.id} onClick={() => { onGameSelect(game.id); onClose(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '14px', backgroundColor: '#0f1923', border: '1px solid #2d4a5a',
                    borderRadius: '10px', cursor: 'pointer', textAlign: 'left', width: '100%',
                    transition: 'border-color 0.15s'
                  }}>
                  <span style={{ fontSize: '28px' }}>{game.icon}</span>
                  <div>
                    <div style={{ color: 'white', fontWeight: 'bold', fontSize: '15px' }}>{game.name}</div>
                    <div style={{ color: '#8a9bb0', fontSize: '12px', marginTop: '2px' }}>{game.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Leaderboard */}
          {tab === 'leaderboard' && (
            <div>
              <div style={{ color: '#8a9bb0', fontSize: '11px', letterSpacing: '1px', marginBottom: '12px' }}>TOP SPIELER</div>
              {leaderboard.map((u, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px', backgroundColor: '#0f1923', borderRadius: '8px', marginBottom: '6px',
                  border: `1px solid ${i === 0 ? '#f5a623' : i === 1 ? '#8a9bb0' : i === 2 ? '#cd7f32' : '#2d4a5a'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                    <div>
                      <div style={{ fontWeight: 'bold', color: u.username === user?.username ? '#00e701' : 'white' }}>{u.username}</div>
                      <div style={{ color: '#8a9bb0', fontSize: '11px' }}>{u.total_bets} Spiele · {u.total_wins} Siege</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#00e701', fontWeight: 'bold' }}>{u.balance.toFixed(2)}€</div>
                    <div style={{ color: '#f5a623', fontSize: '11px' }}>🏆 {u.biggest_win.toFixed(2)}€</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* History */}
          {tab === 'history' && (
            <div>
              <div style={{ color: '#8a9bb0', fontSize: '11px', letterSpacing: '1px', marginBottom: '12px' }}>LETZTE 20 RUNDEN</div>
              {history.length === 0 && <div style={{ color: '#8a9bb0', textAlign: 'center', padding: '20px' }}>Noch keine Spiele...</div>}
              {history.map((h, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', backgroundColor: '#0f1923', borderRadius: '8px', marginBottom: '5px',
                  borderLeft: `3px solid ${h.did_win ? '#00e701' : '#ff4444'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>{h.game === 'dice' ? '🎲' : h.game === 'mines' ? '💣' : h.game === 'crash' ? '🚀' : h.game === 'plinko' ? '🎯' : '🎮'}</span>
                    <div>
                      <div style={{ color: 'white', fontSize: '13px', fontWeight: 'bold', textTransform: 'capitalize' }}>{h.game}</div>
                      <div style={{ color: '#8a9bb0', fontSize: '11px' }}>{new Date(h.created_at).toLocaleString('de-DE')}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: h.did_win ? '#00e701' : '#ff4444', fontWeight: 'bold', fontSize: '13px' }}>
                      {h.did_win ? '+' : '-'}{h.result.toFixed(2)}€
                    </div>
                    <div style={{ color: '#8a9bb0', fontSize: '11px' }}>Einsatz: {h.bet.toFixed(2)}€</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Challenges */}
          {tab === 'challenges' && (
            <div>
              <div style={{ color: '#8a9bb0', fontSize: '11px', letterSpacing: '1px', marginBottom: '12px' }}>CHALLENGES</div>
              {challenges.map((c, i) => (
                <div key={i} style={{ padding: '14px', backgroundColor: '#0f1923', borderRadius: '10px', marginBottom: '8px', border: `1px solid ${c.claimed ? '#2d4a5a' : c.completed ? '#f5a623' : '#2d4a5a'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ color: c.claimed ? '#8a9bb0' : 'white', fontWeight: 'bold', fontSize: '13px' }}>{c.label}</div>
                    <div style={{ color: '#f5a623', fontSize: '12px', fontWeight: 'bold' }}>+{c.reward}€</div>
                  </div>
                  <div style={{ backgroundColor: '#2d4a5a', borderRadius: '4px', height: '6px', marginBottom: '8px' }}>
                    <div style={{ backgroundColor: c.claimed ? '#8a9bb0' : '#00e701', height: '100%', borderRadius: '4px', width: `${Math.min((c.progress / c.target) * 100, 100)}%`, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: '#8a9bb0', fontSize: '11px' }}>{c.progress}/{c.target}</div>
                    {c.completed && !c.claimed && (
                      <button onClick={() => handleClaim(c.id)}
                        style={{ padding: '5px 12px', backgroundColor: '#f5a623', border: 'none', color: '#000', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                        Abholen!
                      </button>
                    )}
                    {c.claimed && <span style={{ color: '#8a9bb0', fontSize: '11px' }}>✓ Abgeholt</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Settings */}
            {tab === 'settings' && (
                <div>
                    <div style={{ color: '#8a9bb0', fontSize: '11px', letterSpacing: '1px', marginBottom: '12px' }}>EINSTELLUNGEN</div> 
                <div style={{ marginTop: '20px', padding: '14px', backgroundColor: '#0f1923', borderRadius: '10px' }}>
                <div style={{ color: '#8a9bb0', fontSize: '11px', marginBottom: '8px' }}>ACCOUNT INFO</div>
                <div style={{ color: 'white', fontSize: '13px' }}>👤 {user?.username}</div>
                <div style={{ color: '#8a9bb0', fontSize: '12px', marginTop: '4px' }}>
                  {user?.is_admin ? '👑 Administrator' : '🎮 Spieler'}
                </div>
              </div>

              {/* Benutzername ändern */}
              <div style={{ marginTop: '12px', padding: '14px', backgroundColor: '#0f1923', borderRadius: '10px' }}>
                <div style={{ color: '#8a9bb0', fontSize: '11px', marginBottom: '10px' }}>BENUTZERNAME ÄNDERN</div>
                <input placeholder="Neuer Benutzername..." value={newUsername} onChange={e => setNewUsername(e.target.value)}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#1a2c38', border: '1px solid #2d4a5a', color: 'white', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px' }} />
                <button onClick={handleChangeUsername}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#00e701', border: 'none', color: '#000', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                  Benutzername ändern
                </button>
              </div>

              {/* Passwort ändern */}
              <div style={{ marginTop: '12px', padding: '14px', backgroundColor: '#0f1923', borderRadius: '10px' }}>
                <div style={{ color: '#8a9bb0', fontSize: '11px', marginBottom: '10px' }}>PASSWORT ÄNDERN</div>
                <input type="password" placeholder="Altes Passwort..." value={oldPassword} onChange={e => setOldPassword(e.target.value)}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#1a2c38', border: '1px solid #2d4a5a', color: 'white', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px' }} />
                <input type="password" placeholder="Neues Passwort..." value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#1a2c38', border: '1px solid #2d4a5a', color: 'white', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px' }} />
                <button onClick={handleChangePassword}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#00e701', border: 'none', color: '#000', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                  Passwort ändern
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default SideMenu;