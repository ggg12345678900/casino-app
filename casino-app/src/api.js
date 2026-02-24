const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('token');

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
  }
};