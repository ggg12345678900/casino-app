const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const SECRET = process.env.JWT_SECRET || 'casino_secret_key_2024';

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./casino.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    balance REAL DEFAULT 1000.00,
    is_admin INTEGER DEFAULT 0,
    total_bets INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_losses INTEGER DEFAULT 0,
    total_won REAL DEFAULT 0,
    total_lost REAL DEFAULT 0,
    biggest_win REAL DEFAULT 0,
    last_daily TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS game_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    game TEXT,
    bet REAL,
    result REAL,
    did_win INTEGER,
    multiplier REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

 db.run(`CREATE TABLE IF NOT EXISTS challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    challenge_id TEXT,
    progress INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    claimed INTEGER DEFAULT 0,
    UNIQUE(user_id, challenge_id)
  )`);

  const adminPass = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO users (username, password, balance, is_admin) 
          VALUES ('admin', ?, 999999, 1)`, [adminPass]);

  // Add last_daily column if not exists
  db.run(`ALTER TABLE users ADD COLUMN last_daily TEXT DEFAULT NULL`, () => {});
});

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Kein Token' });
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { res.status(401).json({ error: 'Ungültiger Token' }); }
};

const adminAuth = (req, res, next) => {
  auth(req, res, () => {
    if (!req.user.is_admin) return res.status(403).json({ error: 'Kein Admin' });
    next();
  });
};

// Register
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Felder fehlen' });
  if (username.length < 3) return res.status(400).json({ error: 'Name zu kurz (min. 3)' });
  if (password.length < 4) return res.status(400).json({ error: 'Passwort zu kurz (min. 4)' });
  const hash = bcrypt.hashSync(password, 10);
  db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hash], function(err) {
    if (err) return res.status(400).json({ error: 'Benutzername bereits vergeben' });
    const token = jwt.sign({ id: this.lastID, username, is_admin: 0 }, SECRET, { expiresIn: '7d' });
    res.json({ token, username, balance: 1000, is_admin: 0, id: this.lastID });
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(400).json({ error: 'Falscher Benutzername oder Passwort' });
    const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin }, SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username, balance: user.balance, is_admin: user.is_admin, id: user.id });
  });
});

// Profile
app.get('/api/profile', auth, (req, res) => {
  db.get(`SELECT id, username, balance, is_admin, total_bets, total_wins, total_losses,
          total_won, total_lost, biggest_win, last_daily, created_at FROM users WHERE id = ?`,
    [req.user.id], (err, user) => {
      if (!user) return res.status(404).json({ error: 'User nicht gefunden' });
      res.json(user);
    });
});

// Update stats
app.post('/api/update-stats', auth, (req, res) => {
  const { didWin, amount, newBalance, game, bet, multiplier } = req.body;
  db.run(`UPDATE users SET 
    balance = ?,
    total_bets = total_bets + 1,
    total_wins = total_wins + ?,
    total_losses = total_losses + ?,
    total_won = total_won + ?,
    total_lost = total_lost + ?,
    biggest_win = CASE WHEN ? > biggest_win THEN ? ELSE biggest_win END
    WHERE id = ?`,
    [newBalance, didWin ? 1 : 0, didWin ? 0 : 1, didWin ? amount : 0, didWin ? 0 : amount,
     didWin ? amount : 0, didWin ? amount : 0, req.user.id]);

 db.run(`INSERT INTO game_history (user_id, game, bet, result, did_win, multiplier)
          VALUES (?, ?, ?, ?, ?, ?)`,
    [req.user.id, game || 'unknown', bet || 0, amount, didWin ? 1 : 0, multiplier || 1]);

  // Challenge Tracking
  const userId = req.user.id;

  // Challenge: 100 Einsätze machen
  db.run(`INSERT INTO challenges (user_id, challenge_id, progress) VALUES (?, 'bet100', 1)
          ON CONFLICT(user_id, challenge_id) DO UPDATE SET
          progress = progress + 1,
          completed = CASE WHEN progress + 1 >= 100 THEN 1 ELSE 0 END`,
    [userId]);

  if (didWin) {
    // Challenge: 50 Spiele gewinnen
    db.run(`INSERT INTO challenges (user_id, challenge_id, progress) VALUES (?, 'win50', 1)
            ON CONFLICT(user_id, challenge_id) DO UPDATE SET
            progress = progress + 1,
            completed = CASE WHEN progress + 1 >= 50 THEN 1 ELSE 0 END`,
      [userId]);

    // Challenge: 10x Multiplier
    if (multiplier && multiplier >= 10) {
      db.run(`INSERT INTO challenges (user_id, challenge_id, progress) VALUES (?, 'bigwin', 1)
              ON CONFLICT(user_id, challenge_id) DO UPDATE SET
              progress = 1, completed = 1`,
        [userId]);
    }
  }

  res.json({ success: true });
});

// Game history
app.get('/api/history', auth, (req, res) => {
  db.all(`SELECT * FROM game_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
    [req.user.id], (err, rows) => res.json(rows || []));
});

// Daily bonus
app.post('/api/daily', auth, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  db.get(`SELECT last_daily, balance FROM users WHERE id = ?`, [req.user.id], (err, user) => {
    if (user.last_daily === today)
      return res.status(400).json({ error: 'Heute bereits abgeholt!' });
    const bonus = 100;
    db.run(`UPDATE users SET balance = balance + ?, last_daily = ? WHERE id = ?`,
      [bonus, today, req.user.id], () => {
        res.json({ success: true, bonus, newBalance: user.balance + bonus });
      });
  });
});

// Leaderboard
app.get('/api/leaderboard', auth, (req, res) => {
  db.all(`SELECT username, balance, total_bets, total_wins, total_losses, total_won, biggest_win
          FROM users WHERE is_admin = 0 ORDER BY balance DESC LIMIT 20`,
    (err, rows) => res.json(rows || []));
});

// Challenges
const CHALLENGES_DEF = [
  { id: 'win5', label: '5x hintereinander gewinnen', target: 5, reward: 200 },
  { id: 'bet100', label: '100 Einsätze machen', target: 100, reward: 500 },
  { id: 'win50', label: '50 Spiele gewinnen', target: 50, reward: 300 },
  { id: 'bigwin', label: '10x Multiplier erreichen', target: 1, reward: 250 },
];

app.get('/api/challenges', auth, (req, res) => {
  db.all(`SELECT * FROM challenges WHERE user_id = ?`, [req.user.id], (err, rows) => {
    const result = CHALLENGES_DEF.map(def => {
      const progress = rows?.find(r => r.challenge_id === def.id);
      return { ...def, progress: progress?.progress || 0, completed: progress?.completed || 0, claimed: progress?.claimed || 0 };
    });
    res.json(result);
  });
});

app.post('/api/challenges/claim', auth, (req, res) => {
  const { challengeId } = req.body;
  const def = CHALLENGES_DEF.find(c => c.id === challengeId);
  if (!def) return res.status(400).json({ error: 'Challenge nicht gefunden' });

  db.get(`SELECT * FROM challenges WHERE user_id = ? AND challenge_id = ?`,
    [req.user.id, challengeId], (err, row) => {
      if (!row || !row.completed || row.claimed)
        return res.status(400).json({ error: 'Nicht verfügbar' });
      db.run(`UPDATE challenges SET claimed = 1 WHERE user_id = ? AND challenge_id = ?`,
        [req.user.id, challengeId]);
      db.run(`UPDATE users SET balance = balance + ? WHERE id = ?`, [def.reward, req.user.id]);
      res.json({ success: true, reward: def.reward });
    });
});

// Admin routes
app.get('/api/admin/users', adminAuth, (req, res) => {
  db.all(`SELECT id, username, balance, is_admin, total_bets, total_wins,
          total_losses, total_won, total_lost, biggest_win, created_at
          FROM users ORDER BY created_at DESC`, (err, rows) => res.json(rows || []));
});

app.post('/api/admin/set-balance', adminAuth, (req, res) => {
  const { userId, amount } = req.body;
  db.run(`UPDATE users SET balance = ? WHERE id = ?`, [amount, userId],
    (err) => err ? res.status(500).json({ error: 'Fehler' }) : res.json({ success: true }));
});

app.post('/api/admin/add-balance', adminAuth, (req, res) => {
  const { userId, amount } = req.body;
  db.run(`UPDATE users SET balance = balance + ? WHERE id = ?`, [amount, userId],
    (err) => err ? res.status(500).json({ error: 'Fehler' }) : res.json({ success: true }));
});

app.delete('/api/admin/delete-user/:id', adminAuth, (req, res) => {
  db.run(`DELETE FROM users WHERE id = ? AND is_admin = 0`, [req.params.id],
    (err) => err ? res.status(500).json({ error: 'Fehler' }) : res.json({ success: true }));
});

app.listen(5000, () => console.log('✅ Server läuft auf Port 5000'));