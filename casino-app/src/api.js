// Server-Adresse: aus .env (REACT_APP_API_URL). Fallback: lokal nur auf dem eigenen Rechner,
// sonst immer der Render-Server – damit eine fehlende Build-Variable die Seite nicht lahmlegt.
const ON_LOCALHOST = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
export const BASE = process.env.REACT_APP_API_URL
  || (ON_LOCALHOST ? 'http://localhost:5000/api' : 'https://casino-app-server.onrender.com/api');
const getToken = () => localStorage.getItem('token');

// Weckt den Render-Server auf (schläft im Gratis-Tarif nach ~15 min ohne Besucher)
export const wakeServer = () => fetch(`${BASE}/mogul-leaderboard`).catch(() => {});

export const api = {
  register: (username, password) =>
    fetch(`${BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    }).then(r => r.json()),

  login: (username, password) =>
    fetch(`${BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    }).then(r => r.json()),

  profile: () =>
    fetch(`${BASE}/profile`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    }).then(r => r.json()),

  updateStats: (didWin, amount, newBalance, game, bet, multiplier) =>
    fetch(`${BASE}/update-stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ didWin, amount, newBalance, game, bet, multiplier })
    }).then(r => r.json()),

  history: () =>
    fetch(`${BASE}/history`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    }).then(r => r.json()),

  daily: () =>
    fetch(`${BASE}/daily`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` }
    }).then(r => r.json()),

  leaderboard: () =>
    fetch(`${BASE}/leaderboard`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    }).then(r => r.json()),

  challenges: () =>
    fetch(`${BASE}/challenges`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    }).then(r => r.json()),

  claimChallenge: (challengeId) =>
    fetch(`${BASE}/challenges/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ challengeId })
    }).then(r => r.json()),

  admin: {
    getUsers: () =>
      fetch(`${BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      }).then(r => r.json()),

    setBalance: (userId, amount) =>
      fetch(`${BASE}/admin/set-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ userId, amount })
      }).then(r => r.json()),

    addBalance: (userId, amount) =>
      fetch(`${BASE}/admin/add-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ userId, amount })
      }).then(r => r.json()),

    deleteUser: (userId) =>
      fetch(`${BASE}/admin/delete-user/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      }).then(r => r.json()),
  },

    changeUsername: (newUsername) =>
      fetch(`${BASE}/change-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ newUsername })
      }).then(r => r.json()),

    changePassword: (oldPassword, newPassword) =>
      fetch(`${BASE}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ oldPassword, newPassword })
       }).then(r => r.json()),

  buyDifficulty: (difficulty) =>
    fetch(`${BASE}/buy-difficulty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ difficulty })
    }).then(r => r.json()),

  unlockGame: (game) =>
    fetch(`${BASE}/unlock-game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ game })
    }).then(r => r.json()),

  upgradeMaxbet: (game) =>
    fetch(`${BASE}/upgrade-maxbet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ game })
    }).then(r => r.json()),

  upgradeWinrate: (game) =>
    fetch(`${BASE}/upgrade-winrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ game })
    }).then(r => r.json()),

  prestige: () =>
    fetch(`${BASE}/prestige`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then(r => r.json()),

  sendFeedback: (data) =>
    fetch(`${BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(data)
    }).then(r => r.json()),

  jackpot: () =>
    fetch(`${BASE}/jackpot`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json()),

  jackpotContribute: (amount) =>
    fetch(`${BASE}/jackpot/contribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ amount })
    }).then(r => r.json()),

  jackpotClaim: (game, maxBet) =>
    fetch(`${BASE}/jackpot/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ game, maxBet })
    }).then(r => r.json()),

  getSave: () =>
    fetch(`${BASE}/save`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    }).then(r => r.json()),

  putSave: (save, keepalive = false, reset = false) =>
    fetch(`${BASE}/save`, {
      method: 'POST',
      keepalive,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ save, reset })
    }).then(r => r.json()),

  mogulLeaderboard: (by = 'money') =>
    fetch(`${BASE}/mogul-leaderboard${by === 'combo' ? '?by=combo' : ''}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    }).then(r => r.json()),

  idle: () =>
    fetch(`${BASE}/idle`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    }).then(r => r.json()),

  idleClaim: () =>
    fetch(`${BASE}/idle/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then(r => r.json()),

  idleBuy: (businessId) =>
    fetch(`${BASE}/idle/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ businessId })
    }).then(r => r.json()),

  upgradeGlobal: (upgradeId) =>
    fetch(`${BASE}/upgrade-global`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ upgradeId })
    }).then(r => r.json()),
};