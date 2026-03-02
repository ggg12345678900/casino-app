require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const SECRET = process.env.JWT_SECRET;
if (!SECRET) { console.error('❌ JWT_SECRET fehlt in .env!'); process.exit(1); }

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Tabellen erstellen
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_seen TIMESTAMP DEFAULT NULL,
      unlocked_diffs TEXT DEFAULT '["easy"]',
      unlocked_games TEXT DEFAULT '["dice"]',
      max_bet_levels TEXT DEFAULT '{}',
      winrate_levels TEXT DEFAULT '{}',
      prestige_count INTEGER DEFAULT 0
    )
  `);

  // Spalten für bestehende Datenbanken nachrüsten
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT NULL`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS unlocked_diffs TEXT DEFAULT '["easy"]'`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS unlocked_games TEXT DEFAULT '["dice"]'`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS max_bet_levels TEXT DEFAULT '{}'`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS winrate_levels TEXT DEFAULT '{}'`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS prestige_count INTEGER DEFAULT 0`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS game_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      game TEXT,
      bet REAL,
      result REAL,
      did_win INTEGER,
      multiplier REAL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS challenges (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      challenge_id TEXT,
      progress INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      claimed INTEGER DEFAULT 0,
      UNIQUE(user_id, challenge_id)
    )
  `);

  // Admin erstellen / Passwort immer aktuell halten
  const adminPass = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
  await pool.query(`
    INSERT INTO users (username, password, balance, is_admin)
    VALUES ('admin', $1, 999999, 1)
    ON CONFLICT (username) DO UPDATE SET password = $1, is_admin = 1
  `, [adminPass]);

  console.log('✅ Datenbank bereit!');
};

initDB();

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
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Felder fehlen' });
  if (username.length < 3) return res.status(400).json({ error: 'Name zu kurz (min. 3)' });
  if (password.length < 4) return res.status(400).json({ error: 'Passwort zu kurz (min. 4)' });
  if (username.toLowerCase() === 'admin') return res.status(400).json({ error: 'Dieser Benutzername ist nicht erlaubt' });
  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = await pool.query(
      `INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id`,
      [username, hash]
    );
    const token = jwt.sign({ id: result.rows[0].id, username, is_admin: 0 }, SECRET, { expiresIn: '7d' });
    res.json({ token, username, balance: 1000, is_admin: 0, id: result.rows[0].id });
  } catch {
    res.status(400).json({ error: 'Benutzername bereits vergeben' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query(`SELECT * FROM users WHERE username = $1`, [username]);
  const user = result.rows[0];
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(400).json({ error: 'Falscher Benutzername oder Passwort' });
  await pool.query(`UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);
  const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin }, SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username, balance: user.balance, is_admin: user.is_admin, id: user.id });
});

// Profile
app.get('/api/profile', auth, async (req, res) => {
  const result = await pool.query(
    `SELECT id, username, balance, is_admin, total_bets, total_wins, total_losses,
     total_won, total_lost, biggest_win, last_daily, created_at, unlocked_diffs,
     unlocked_games, max_bet_levels, winrate_levels, prestige_count FROM users WHERE id = $1`,
    [req.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'User nicht gefunden' });
  res.json(result.rows[0]);
});

// Buy difficulty
const DIFF_COSTS = { easy: 0, medium: 100, hard: 150, expert: 200 };
app.post('/api/buy-difficulty', auth, async (req, res) => {
  const { difficulty } = req.body;
  if (!DIFF_COSTS.hasOwnProperty(difficulty)) return res.status(400).json({ error: 'Ungültige Schwierigkeit' });
  const cost = DIFF_COSTS[difficulty];
  const result = await pool.query(`SELECT balance, unlocked_diffs FROM users WHERE id = $1`, [req.user.id]);
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: 'User nicht gefunden' });
  const unlocked = JSON.parse(user.unlocked_diffs || '["easy"]');
  if (unlocked.includes(difficulty)) return res.status(400).json({ error: 'Bereits freigeschaltet' });
  if (user.balance < cost) return res.status(400).json({ error: 'Nicht genug Guthaben' });
  const newUnlocked = [...unlocked, difficulty];
  const newBalance = parseFloat((user.balance - cost).toFixed(2));
  await pool.query(
    `UPDATE users SET balance = $1, unlocked_diffs = $2 WHERE id = $3`,
    [newBalance, JSON.stringify(newUnlocked), req.user.id]
  );
  res.json({ balance: newBalance, unlocked_diffs: JSON.stringify(newUnlocked) });
});

// ─── Progression constants (mirrored from progression.js) ────────────────────
const GAMES_META = {
  dice:     { cost: 0,          prestigeReq: 0 },
  mines:    { cost: 1000,       prestigeReq: 0 },
  plinko:   { cost: 10000,      prestigeReq: 0 },
  crash:    { cost: 100000,     prestigeReq: 1 },
  roulette: { cost: 1000000,    prestigeReq: 1 },
  chicken:  { cost: 10000000,   prestigeReq: 2 },
  pump:     { cost: 100000000,  prestigeReq: 2 },
};
const MAX_BET_VALUES = [50, 200, 1000, 5000, 25000, 100000];
const MB_BASE = [1000, 8000, 60000, 400000, 3000000];
const MB_MULT = { dice:1, mines:3, plinko:8, crash:40, roulette:150, chicken:600, pump:2500 };
const maxBetCosts = (g) => MB_BASE.map(c => Math.round(c * (MB_MULT[g]||1)));
const WR_BASE = [500, 3000, 15000, 80000, 400000];
const WR_MULT = { dice:1, mines:4, plinko:12, crash:60, roulette:250, chicken:1000, pump:4000 };
const winrateCosts = (g) => WR_BASE.map(c => Math.round(c * (WR_MULT[g]||1)));
const prestigeCostFn = (count) => Math.round(50000 * Math.pow(10, count));

// Unlock game
app.post('/api/unlock-game', auth, async (req, res) => {
  const { game } = req.body;
  if (!GAMES_META[game]) return res.status(400).json({ error: 'Unbekanntes Spiel' });
  const meta = GAMES_META[game];
  const r = await pool.query(
    `SELECT balance, unlocked_games, prestige_count FROM users WHERE id = $1`, [req.user.id]
  );
  const u = r.rows[0];
  if (!u) return res.status(404).json({ error: 'User nicht gefunden' });
  const unlocked = JSON.parse(u.unlocked_games || '["dice"]');
  if (unlocked.includes(game)) return res.status(400).json({ error: 'Bereits freigeschaltet' });
  if (u.prestige_count < meta.prestigeReq)
    return res.status(400).json({ error: `Benötigt ${meta.prestigeReq} Prestige(s)` });
  if (u.balance < meta.cost)
    return res.status(400).json({ error: 'Nicht genug Guthaben' });
  const newUnlocked = [...unlocked, game];
  const newBalance  = parseFloat((u.balance - meta.cost).toFixed(2));
  await pool.query(
    `UPDATE users SET balance=$1, unlocked_games=$2 WHERE id=$3`,
    [newBalance, JSON.stringify(newUnlocked), req.user.id]
  );
  res.json({ balance: newBalance, unlocked_games: JSON.stringify(newUnlocked) });
});

// Upgrade max bet
app.post('/api/upgrade-maxbet', auth, async (req, res) => {
  const { game } = req.body;
  if (!GAMES_META[game]) return res.status(400).json({ error: 'Unbekanntes Spiel' });
  const r = await pool.query(`SELECT balance, max_bet_levels FROM users WHERE id=$1`, [req.user.id]);
  const u = r.rows[0];
  const levels = JSON.parse(u.max_bet_levels || '{}');
  const currentLevel = levels[game] || 0;
  if (currentLevel >= 5) return res.status(400).json({ error: 'Bereits auf Maximum' });
  const cost = maxBetCosts(game)[currentLevel];
  if (u.balance < cost) return res.status(400).json({ error: 'Nicht genug Guthaben' });
  levels[game] = currentLevel + 1;
  const newBalance = parseFloat((u.balance - cost).toFixed(2));
  await pool.query(
    `UPDATE users SET balance=$1, max_bet_levels=$2 WHERE id=$3`,
    [newBalance, JSON.stringify(levels), req.user.id]
  );
  res.json({ balance: newBalance, max_bet_levels: JSON.stringify(levels), newLevel: currentLevel + 1, newMaxBet: MAX_BET_VALUES[currentLevel + 1] });
});

// Upgrade win rate
app.post('/api/upgrade-winrate', auth, async (req, res) => {
  const { game } = req.body;
  if (!GAMES_META[game]) return res.status(400).json({ error: 'Unbekanntes Spiel' });
  const r = await pool.query(`SELECT balance, winrate_levels FROM users WHERE id=$1`, [req.user.id]);
  const u = r.rows[0];
  const levels = JSON.parse(u.winrate_levels || '{}');
  const currentLevel = levels[game] || 0;
  if (currentLevel >= 5) return res.status(400).json({ error: 'Bereits auf Maximum' });
  const cost = winrateCosts(game)[currentLevel];
  if (u.balance < cost) return res.status(400).json({ error: 'Nicht genug Guthaben' });
  levels[game] = currentLevel + 1;
  const newBalance = parseFloat((u.balance - cost).toFixed(2));
  await pool.query(
    `UPDATE users SET balance=$1, winrate_levels=$2 WHERE id=$3`,
    [newBalance, JSON.stringify(levels), req.user.id]
  );
  res.json({ balance: newBalance, winrate_levels: JSON.stringify(levels), newLevel: currentLevel + 1 });
});

// Prestige
app.post('/api/prestige', auth, async (req, res) => {
  const r = await pool.query(
    `SELECT balance, unlocked_games, prestige_count FROM users WHERE id=$1`, [req.user.id]
  );
  const u = r.rows[0];
  const unlocked = JSON.parse(u.unlocked_games || '["dice"]');
  if (unlocked.length < 3) return res.status(400).json({ error: 'Mindestens 3 Spiele nötig' });
  const cost = prestigeCostFn(u.prestige_count);
  if (u.balance < cost) return res.status(400).json({ error: 'Nicht genug Guthaben' });
  const newPrestige = u.prestige_count + 1;
  await pool.query(`
    UPDATE users SET
      balance = 1000,
      unlocked_games = '["dice"]',
      max_bet_levels = '{}',
      winrate_levels = '{}',
      prestige_count = $1
    WHERE id = $2
  `, [newPrestige, req.user.id]);
  res.json({ prestige_count: newPrestige, balance: 1000, unlocked_games: '["dice"]', max_bet_levels: '{}', winrate_levels: '{}' });
});

// Update stats
app.post('/api/update-stats', auth, async (req, res) => {
  const { didWin, amount, newBalance, game, bet, multiplier } = req.body;
  await pool.query(`
    UPDATE users SET
      balance = $1,
      total_bets = total_bets + 1,
      total_wins = total_wins + $2,
      total_losses = total_losses + $3,
      total_won = total_won + $4,
      total_lost = total_lost + $5,
      biggest_win = CASE WHEN $6 > biggest_win THEN $6 ELSE biggest_win END
    WHERE id = $7`,
    [newBalance, didWin ? 1 : 0, didWin ? 0 : 1, didWin ? amount : 0, didWin ? 0 : amount,
     didWin ? amount : 0, req.user.id]
  );
  await pool.query(
    `INSERT INTO game_history (user_id, game, bet, result, did_win, multiplier)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [req.user.id, game || 'unknown', bet || 0, amount, didWin ? 1 : 0, multiplier || 1]
  );

  // Challenge Tracking
  // bet100 - 100 Einsätze machen
  await pool.query(`
    INSERT INTO challenges (user_id, challenge_id, progress)
    VALUES ($1, 'bet100', 1)
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
      progress = CASE WHEN challenges.completed = 0 THEN challenges.progress + 1 ELSE challenges.progress END,
      completed = CASE WHEN challenges.completed = 0 AND challenges.progress + 1 >= 100 THEN 1 ELSE challenges.completed END`,
    [req.user.id]
  );

  if (didWin) {
    // win50 - 50 Spiele gewinnen
    await pool.query(`
      INSERT INTO challenges (user_id, challenge_id, progress)
      VALUES ($1, 'win50', 1)
      ON CONFLICT (user_id, challenge_id)
      DO UPDATE SET
        progress = CASE WHEN challenges.completed = 0 THEN challenges.progress + 1 ELSE challenges.progress END,
        completed = CASE WHEN challenges.completed = 0 AND challenges.progress + 1 >= 50 THEN 1 ELSE challenges.completed END`,
      [req.user.id]
    );

    // bigwin - 10x Multiplier
    if (multiplier && parseFloat(multiplier) >= 10) {
      await pool.query(`
        INSERT INTO challenges (user_id, challenge_id, progress, completed)
        VALUES ($1, 'bigwin', 1, 1)
        ON CONFLICT (user_id, challenge_id)
        DO UPDATE SET progress = 1, completed = 1
        WHERE challenges.completed = 0`,
        [req.user.id]
      );
    }

    // win5 - 5x hintereinander gewinnen
    await pool.query(`
      INSERT INTO challenges (user_id, challenge_id, progress)
      VALUES ($1, 'win5', 1)
      ON CONFLICT (user_id, challenge_id)
      DO UPDATE SET
        progress = CASE WHEN challenges.completed = 0 THEN challenges.progress + 1 ELSE challenges.progress END,
        completed = CASE WHEN challenges.completed = 0 AND challenges.progress + 1 >= 5 THEN 1 ELSE challenges.completed END`,
      [req.user.id]
    );
  } else {
    // win5 zurücksetzen bei Verlust - nur wenn noch nicht abgeschlossen
    await pool.query(`
      INSERT INTO challenges (user_id, challenge_id, progress)
      VALUES ($1, 'win5', 0)
      ON CONFLICT (user_id, challenge_id)
      DO UPDATE SET progress = CASE WHEN challenges.completed = 0 THEN 0 ELSE challenges.progress END`,
      [req.user.id]
    );
  }

  res.json({ success: true });
})
// Game history
app.get('/api/history', auth, async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM game_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [req.user.id]
  );
  res.json(result.rows);
});

// Daily bonus
app.post('/api/daily', auth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const result = await pool.query(`SELECT last_daily, balance FROM users WHERE id = $1`, [req.user.id]);
  const user = result.rows[0];
  if (user.last_daily === today)
    return res.status(400).json({ error: 'Heute bereits abgeholt!' });
  const bonus = 100;
  await pool.query(`UPDATE users SET balance = balance + $1, last_daily = $2 WHERE id = $3`,
    [bonus, today, req.user.id]);
  res.json({ success: true, bonus, newBalance: user.balance + bonus });
});

// Leaderboard
app.get('/api/leaderboard', auth, async (req, res) => {
  const result = await pool.query(
    `SELECT username, balance, total_bets, total_wins, total_losses, total_won, biggest_win
     FROM users WHERE is_admin = 0 ORDER BY balance DESC LIMIT 20`
  );
  res.json(result.rows);
});

// Challenges
const CHALLENGES_DEF = [
  { id: 'win5', label: '5x hintereinander gewinnen', target: 5, reward: 200 },
  { id: 'bet100', label: '100 Einsätze machen', target: 100, reward: 500 },
  { id: 'win50', label: '50 Spiele gewinnen', target: 50, reward: 300 },
  { id: 'bigwin', label: '10x Multiplier erreichen', target: 1, reward: 250 },
];

app.get('/api/challenges', auth, async (req, res) => {
  const result = await pool.query(`SELECT * FROM challenges WHERE user_id = $1`, [req.user.id]);
  const rows = result.rows;
  const challenges = CHALLENGES_DEF.map(def => {
    const progress = rows.find(r => r.challenge_id === def.id);
    return { ...def, progress: progress?.progress || 0, completed: progress?.completed || 0, claimed: progress?.claimed || 0 };
  });
  res.json(challenges);
});

app.post('/api/challenges/claim', auth, async (req, res) => {
  const { challengeId } = req.body;
  const def = CHALLENGES_DEF.find(c => c.id === challengeId);
  if (!def) return res.status(400).json({ error: 'Challenge nicht gefunden' });
  const result = await pool.query(
    `SELECT * FROM challenges WHERE user_id = $1 AND challenge_id = $2`,
    [req.user.id, challengeId]
  );
  const row = result.rows[0];
  if (!row || !row.completed || row.claimed)
    return res.status(400).json({ error: 'Nicht verfügbar' });
  await pool.query(`UPDATE challenges SET claimed = 1 WHERE user_id = $1 AND challenge_id = $2`,
    [req.user.id, challengeId]);
  await pool.query(`UPDATE users SET balance = balance + $1 WHERE id = $2`, [def.reward, req.user.id]);
  res.json({ success: true, reward: def.reward });
});

// Benutzername ändern
app.post('/api/change-username', auth, async (req, res) => {
  const { newUsername } = req.body;
  if (!newUsername || newUsername.length < 3)
    return res.status(400).json({ error: 'Name zu kurz (min. 3)' });
  try {
    await pool.query(`UPDATE users SET username = $1 WHERE id = $2`, [newUsername, req.user.id]);
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Benutzername bereits vergeben' });
  }
});

// Passwort ändern
app.post('/api/change-password', auth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 4)
    return res.status(400).json({ error: 'Passwort zu kurz (min. 4)' });
  const result = await pool.query(`SELECT password FROM users WHERE id = $1`, [req.user.id]);
  const user = result.rows[0];
  if (!bcrypt.compareSync(oldPassword, user.password))
    return res.status(400).json({ error: 'Altes Passwort falsch!' });
  const hash = bcrypt.hashSync(newPassword, 10);
  await pool.query(`UPDATE users SET password = $1 WHERE id = $2`, [hash, req.user.id]);
  res.json({ success: true });
});

// Admin setup
app.post('/api/setup-admin', async (req, res) => {
  const { username, setupKey } = req.body;
  if (setupKey !== 'casino-setup-2024')
    return res.status(403).json({ error: 'Falscher Key' });
  await pool.query(`UPDATE users SET is_admin = 1 WHERE username = $1`, [username]);
  res.json({ success: true, message: `${username} ist jetzt Admin!` });
});

// Admin routes
app.get('/api/admin/users', adminAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT id, username, balance, is_admin, total_bets, total_wins,
     total_losses, total_won, total_lost, biggest_win, created_at, last_seen
     FROM users ORDER BY created_at DESC`
  );
  res.json(result.rows);
});

app.post('/api/admin/set-balance', adminAuth, async (req, res) => {
  const { userId, amount } = req.body;
  await pool.query(`UPDATE users SET balance = $1 WHERE id = $2`, [amount, userId]);
  res.json({ success: true });
});

app.post('/api/admin/add-balance', adminAuth, async (req, res) => {
  const { userId, amount } = req.body;
  await pool.query(`UPDATE users SET balance = balance + $1 WHERE id = $2`, [amount, userId]);
  res.json({ success: true });
});

app.delete('/api/admin/delete-user/:id', adminAuth, async (req, res) => {
  await pool.query(`DELETE FROM users WHERE id = $1 AND is_admin = 0`, [req.params.id]);
  res.json({ success: true });
});

app.listen(5000, () => console.log('✅ Server läuft auf Port 5000'));
``