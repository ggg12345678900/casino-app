const path = require('path');
// Lokal: server/.env und die von `neon deploy` erzeugte ../.env.local. Auf Render kommen die Werte aus dem Dashboard.
require('dotenv').config({ path: [path.join(__dirname, '.env'), path.join(__dirname, '..', '.env.local')], quiet: true });
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

if (!process.env.DATABASE_URL) { console.error('❌ DATABASE_URL fehlt!'); process.exit(1); }

// Neon: gepoolte Verbindung (Host mit -pooler) für den laufenden Server.
// Neon schaltet die Datenbank bei Inaktivität ab (Scale-to-Zero) – getrennte Leerlauf-Verbindungen
// dürfen den Server nicht abstürzen lassen; die nächste Anfrage weckt die Datenbank wieder.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});
pool.on('error', (err) => console.error('⚠️ Datenbank-Verbindung getrennt (wird neu aufgebaut):', err.message));

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
  await pool.query(`UPDATE users SET prestige_count = 0 WHERE prestige_count IS NULL`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS global_upgrade_levels TEXT DEFAULT '{}'`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS idle_levels TEXT DEFAULT '{}'`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS idle_last_claim TIMESTAMP DEFAULT NULL`);
  // Casino-Mogul Spielstand
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS save_data TEXT DEFAULT NULL`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS save_at TIMESTAMP DEFAULT NULL`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mogul_location INTEGER DEFAULT 0`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mogul_earned DOUBLE PRECISION DEFAULT 0`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mogul_max_combo INTEGER DEFAULT 0`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_jackpot_at TIMESTAMP DEFAULT NULL`);
  // Gemeinsamer Jackpot für alle Spieler
  await pool.query(`CREATE TABLE IF NOT EXISTS jackpot (id INTEGER PRIMARY KEY, pool DOUBLE PRECISION NOT NULL DEFAULT 0)`);
  await pool.query(`INSERT INTO jackpot (id, pool) VALUES (1, 1000) ON CONFLICT (id) DO NOTHING`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jackpot_wins (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      username TEXT,
      amount DOUBLE PRECISION,
      game TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      username TEXT,
      rating INTEGER,
      category TEXT,
      message TEXT,
      context TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Admin-Menü: Sperren, Ranglisten-Ausblendung, Vertrauen nach Admin-Änderungen, Aktionen, Einstellungen
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS lb_hidden BOOLEAN DEFAULT FALSE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_until TIMESTAMP DEFAULT NULL`);
  await pool.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS done BOOLEAN DEFAULT FALSE`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_actions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      applied_at TIMESTAMP DEFAULT NULL
    )
  `);
  await pool.query(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);

  // Admin erstellen / Passwort immer aktuell halten
  const adminPass = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
  await pool.query(`
    INSERT INTO users (username, password, balance, is_admin)
    VALUES ('admin', $1, 999999, 1)
    ON CONFLICT (username) DO UPDATE SET password = $1, is_admin = 1
  `, [adminPass]);

  console.log('✅ Datenbank bereit!');
};

initDB().catch((err) => {
  console.error('❌ Datenbank nicht erreichbar:', err.message);
  process.exit(1);
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

// Lebenszeichen (ohne Login) – weckt den Server auf, z. B. beim Öffnen der Login-Seite
app.get('/api/health', (req, res) => res.json({ ok: true }));

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
  } catch (e) {
    if (e && e.code === '23505') return res.status(400).json({ error: 'Benutzername bereits vergeben' });
    console.error('Registrierung fehlgeschlagen:', e && e.message);
    res.status(503).json({ error: 'Server-Problem – bitte in ein paar Sekunden nochmal versuchen.' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query(`SELECT * FROM users WHERE username = $1`, [username]);
  const user = result.rows[0];
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(400).json({ error: 'Falscher Benutzername oder Passwort' });
  if (user.banned) return res.status(403).json({ error: 'Dieser Account ist gesperrt.' });
  await pool.query(`UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);
  const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin }, SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username, balance: user.balance, is_admin: user.is_admin, id: user.id });
});

// Profile
app.get('/api/profile', auth, async (req, res) => {
  const result = await pool.query(
    `SELECT id, username, balance, is_admin, total_bets, total_wins, total_losses,
     total_won, total_lost, biggest_win, last_daily, created_at, unlocked_diffs,
     unlocked_games, max_bet_levels, winrate_levels, COALESCE(prestige_count, 0) AS prestige_count,
     COALESCE(global_upgrade_levels, '{}') AS global_upgrade_levels FROM users WHERE id = $1`,
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
  blackjack:{ cost: 1000000000, prestigeReq: 3 },
};
const MAX_BET_VALUES = [50, 200, 1000, 5000, 25000, 100000];
const MB_BASE = [200, 1000, 5000, 25000, 150000];
const MB_MULT = { dice:1, mines:2, plinko:5, crash:15, roulette:50, chicken:150, pump:500, blackjack:1500 };
const maxBetCosts = (g) => MB_BASE.map(c => Math.round(c * (MB_MULT[g]||1)));
const WR_BASE = [100, 500, 2500, 12000, 60000];
const WR_MULT = { dice:1, mines:2, plinko:5, crash:15, roulette:50, chicken:150, pump:500, blackjack:1500 };
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

const GLOBAL_START_BALANCE = [1000, 2000, 5000, 10000, 25000, 50000];
const GLOBAL_DAILY_BONUS   = [100, 200, 500, 1000, 2500, 5000];

// Prestige
app.post('/api/prestige', auth, async (req, res) => {
  const r = await pool.query(
    `SELECT balance, unlocked_games, prestige_count, COALESCE(global_upgrade_levels, '{}') AS global_upgrade_levels FROM users WHERE id=$1`, [req.user.id]
  );
  const u = r.rows[0];
  const unlocked = JSON.parse(u.unlocked_games || '["dice"]');
  if (unlocked.length < 3) return res.status(400).json({ error: 'Mindestens 3 Spiele nötig' });
  const cost = prestigeCostFn(u.prestige_count);
  if (u.balance < cost) return res.status(400).json({ error: 'Nicht genug Guthaben' });
  const newPrestige = u.prestige_count + 1;
  const gLevels = JSON.parse(u.global_upgrade_levels || '{}');
  const startBalLevel = gLevels['start_balance'] || 0;
  const startBal = GLOBAL_START_BALANCE[startBalLevel];
  await pool.query(`
    UPDATE users SET
      balance = $1,
      unlocked_games = '["dice"]',
      max_bet_levels = '{}',
      winrate_levels = '{}',
      idle_levels = '{}',
      idle_last_claim = NOW(),
      prestige_count = $2
    WHERE id = $3
  `, [startBal, newPrestige, req.user.id]);
  res.json({ prestige_count: newPrestige, balance: startBal, unlocked_games: '["dice"]', max_bet_levels: '{}', winrate_levels: '{}' });
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
  const result = await pool.query(
    `SELECT last_daily, balance, COALESCE(global_upgrade_levels, '{}') AS global_upgrade_levels FROM users WHERE id = $1`,
    [req.user.id]
  );
  const user = result.rows[0];
  if (user.last_daily === today)
    return res.status(400).json({ error: 'Heute bereits abgeholt!' });
  const gLevels = JSON.parse(user.global_upgrade_levels || '{}');
  const dailyLevel = gLevels['daily_bonus'] || 0;
  const bonus = GLOBAL_DAILY_BONUS[dailyLevel];
  await pool.query(`UPDATE users SET balance = balance + $1, last_daily = $2 WHERE id = $3`,
    [bonus, today, req.user.id]);
  res.json({ success: true, bonus, newBalance: user.balance + bonus });
});

// Globale Upgrades
const GLOBAL_UPGRADE_DEFS = {
  global_mult:   { maxLevel: 5, costs: [5000, 25000, 150000, 1000000, 8000000] },
  start_balance: { maxLevel: 5, costs: [2000, 15000, 100000, 750000, 5000000] },
  auto_speed:    { maxLevel: 5, costs: [3000, 20000, 120000, 800000, 6000000] },
  daily_bonus:   { maxLevel: 5, costs: [1000, 8000, 60000, 500000, 4000000] },
};

app.post('/api/upgrade-global', auth, async (req, res) => {
  const { upgradeId } = req.body;
  const def = GLOBAL_UPGRADE_DEFS[upgradeId];
  if (!def) return res.status(400).json({ error: 'Unbekanntes Upgrade' });
  const r = await pool.query(
    `SELECT balance, COALESCE(global_upgrade_levels, '{}') AS global_upgrade_levels FROM users WHERE id=$1`,
    [req.user.id]
  );
  const u = r.rows[0];
  const levels = JSON.parse(u.global_upgrade_levels || '{}');
  const currentLevel = levels[upgradeId] || 0;
  if (currentLevel >= def.maxLevel) return res.status(400).json({ error: 'Bereits auf Maximum' });
  const cost = def.costs[currentLevel];
  if (u.balance < cost) return res.status(400).json({ error: 'Nicht genug Guthaben' });
  levels[upgradeId] = currentLevel + 1;
  const newBalance = parseFloat((u.balance - cost).toFixed(2));
  await pool.query(
    `UPDATE users SET balance=$1, global_upgrade_levels=$2 WHERE id=$3`,
    [newBalance, JSON.stringify(levels), req.user.id]
  );
  res.json({ balance: newBalance, global_upgrade_levels: JSON.stringify(levels), newLevel: currentLevel + 1 });
});

// ─── Idle-Business (passives Einkommen) ──────────────────────────────────────
// Gespiegelt aus casino-app/src/progression.js
const IDLE_BUSINESSES = {
  slot:   { baseCost: 500,       income: 1 },
  table:  { baseCost: 6000,      income: 8 },
  bar:    { baseCost: 70000,     income: 60 },
  hotel:  { baseCost: 800000,    income: 450 },
  yacht:  { baseCost: 10000000,  income: 3500 },
  island: { baseCost: 150000000, income: 30000 },
};
const IDLE_COST_GROWTH = 1.15;
const IDLE_OFFLINE_CAP_SEC = 8 * 3600;
const idleCost = (id, owned) => Math.round(IDLE_BUSINESSES[id].baseCost * Math.pow(IDLE_COST_GROWTH, owned));

// Einkommen pro Sekunde inkl. Prestige- und Global-Multiplikator
const idleRate = (u) => {
  const levels = JSON.parse(u.idle_levels || '{}');
  const g = JSON.parse(u.global_upgrade_levels || '{}');
  const base = Object.entries(IDLE_BUSINESSES).reduce((s, [id, b]) => s + (levels[id] || 0) * b.income, 0);
  return base * Math.pow(2, u.prestige_count || 0) * (1 + (g.global_mult || 0) * 0.03);
};

// Liest den User gesperrt (FOR UPDATE) und berechnet die offenen Einnahmen
const loadIdle = async (client, userId) => {
  const r = await client.query(
    `SELECT balance, COALESCE(prestige_count, 0) AS prestige_count,
       COALESCE(idle_levels, '{}') AS idle_levels,
       COALESCE(global_upgrade_levels, '{}') AS global_upgrade_levels,
       COALESCE(EXTRACT(EPOCH FROM (NOW() - idle_last_claim)), 0) AS elapsed
     FROM users WHERE id = $1 FOR UPDATE`, [userId]);
  const u = r.rows[0];
  if (!u) return null;
  const rate = idleRate(u);
  const seconds = Math.min(Math.max(parseFloat(u.elapsed) || 0, 0), IDLE_OFFLINE_CAP_SEC);
  return { u, rate, pending: parseFloat((rate * seconds).toFixed(2)), seconds };
};

const withTx = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

app.get('/api/idle', auth, async (req, res) => {
  try {
    const out = await withTx(async (c) => loadIdle(c, req.user.id));
    if (!out) return res.status(404).json({ error: 'User nicht gefunden' });
    res.json({ idle_levels: out.u.idle_levels, rate: out.rate, pending: out.pending, seconds: out.seconds, cap: IDLE_OFFLINE_CAP_SEC });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Serverfehler' }); }
});

app.post('/api/idle/claim', auth, async (req, res) => {
  try {
    const out = await withTx(async (c) => {
      const d = await loadIdle(c, req.user.id);
      if (!d) return { status: 404, body: { error: 'User nicht gefunden' } };
      const newBalance = parseFloat((d.u.balance + d.pending).toFixed(2));
      await c.query(`UPDATE users SET balance = $1, idle_last_claim = NOW() WHERE id = $2`, [newBalance, req.user.id]);
      return { body: { balance: newBalance, claimed: d.pending, rate: d.rate } };
    });
    res.status(out.status || 200).json(out.body);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Serverfehler' }); }
});

app.post('/api/idle/buy', auth, async (req, res) => {
  const { businessId } = req.body;
  if (!IDLE_BUSINESSES[businessId]) return res.status(400).json({ error: 'Unbekanntes Business' });
  try {
    const out = await withTx(async (c) => {
      const d = await loadIdle(c, req.user.id);
      if (!d) return { status: 404, body: { error: 'User nicht gefunden' } };
      // Offene Einnahmen zuerst gutschreiben, dann kaufen (Rate ändert sich)
      const levels = JSON.parse(d.u.idle_levels || '{}');
      const owned = levels[businessId] || 0;
      const cost = idleCost(businessId, owned);
      const available = d.u.balance + d.pending;
      if (available < cost) return { status: 400, body: { error: 'Nicht genug Guthaben' } };
      levels[businessId] = owned + 1;
      const newBalance = parseFloat((available - cost).toFixed(2));
      await c.query(
        `UPDATE users SET balance = $1, idle_levels = $2, idle_last_claim = NOW() WHERE id = $3`,
        [newBalance, JSON.stringify(levels), req.user.id]);
      const rate = idleRate({ ...d.u, idle_levels: JSON.stringify(levels) });
      return { body: { balance: newBalance, idle_levels: JSON.stringify(levels), rate, claimed: d.pending } };
    });
    res.status(out.status || 200).json(out.body);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Serverfehler' }); }
});

// ─── Casino-Mogul: Spielstand ────────────────────────────────────────────────
// Ortskosten gespiegelt aus casino-app/src/game/economy.js (für Plausibilitäts-Check)
const MOGUL_LOCATION_COSTS = [0, 40, 3e5, 3e8, 6e9, 3e11, 1.5e16, 1e17, 2e21, 4e26, 8e27];
// Spielstände aus der Zeit vor dem Tempo-Update (andere Preise) sollen weiter speicherbar bleiben:
// Für den Mindest-Check zählt deshalb je Ort der kleinere der alten und neuen Preise.
const MOGUL_LOCATION_COSTS_OLD = [0, 25, 1e4, 8e6, 4.8e9, 3e12, 4e15, 1e17, 2e21, 4e26, 8e27];
const MOGUL_MIN_COSTS = MOGUL_LOCATION_COSTS.map((c, i) => Math.min(c, MOGUL_LOCATION_COSTS_OLD[i]));
const MOGUL_MIN_SAVE_INTERVAL_MS = 3000;
// Wachstums-Grenze gegen gefälschte Spielstände. Ehrliche Spieler wachsen laut Simulation
// in 30 s höchstens ≈ ×9 (Glücksrad-Jackpot); erlaubt sind ×20 pro 30 s, die Grenze verdoppelt
// sich zusätzlich alle 3 Minuten seit dem letzten Speichern (Offline-Pausen, Neustarts).
const GROWTH_PER_30S = 20;
const GROWTH_DOUBLING_SEC = 180;
const GROWTH_FREE = 10000; // Startfreibetrag
const growthLimit = (prev, sinceSec) => {
  const sec = Math.max(30, Math.min(sinceSec, 24 * 3600));
  return Math.max(prev, 1) * GROWTH_PER_30S * Math.pow(2, (sec - 30) / GROWTH_DOUBLING_SEC) + GROWTH_FREE;
};

app.get('/api/save', auth, async (req, res) => {
  const r = await pool.query(`SELECT save_data FROM users WHERE id = $1`, [req.user.id]);
  if (!r.rows[0]) return res.status(404).json({ error: 'User nicht gefunden' });
  let save = null;
  try { save = r.rows[0].save_data ? JSON.parse(r.rows[0].save_data) : null; } catch {}
  res.json({ save });
});

app.post('/api/save', auth, async (req, res) => {
  const { save, reset } = req.body || {};
  if (!save || typeof save !== 'object') return res.status(400).json({ error: 'Kein Spielstand' });
  const raw = JSON.stringify(save);
  if (raw.length > 100000) return res.status(400).json({ error: 'Spielstand zu groß' });

  const flags = (await pool.query(
    `SELECT banned, (trust_until IS NOT NULL AND trust_until > NOW()) AS trusted FROM users WHERE id = $1`, [req.user.id])).rows[0];
  if (!flags) return res.status(404).json({ error: 'User nicht gefunden' });
  if (flags.banned) return res.status(403).json({ error: 'Account gesperrt' });
  const trusted = !!flags.trusted; // kurz nach einer Admin-Änderung: Plausibilitäts-Checks aussetzen
  const location = save.location;
  const earned = save.stats && save.stats.totalEarned;
  const money = save.money;
  const gambleWon = (save.stats && Number.isFinite(save.stats.gambleWon) && save.stats.gambleWon > 0) ? save.stats.gambleWon : 0;
  if (!Number.isInteger(location) || location < 0 || location >= MOGUL_LOCATION_COSTS.length)
    return res.status(400).json({ error: 'Ungültiger Ort' });
  if (![earned, money].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0))
    return res.status(400).json({ error: 'Ungültige Werte' });
  // Wer an Ort X ist, muss mindestens die Kosten aller Orte bis X verdient haben
  const minEarned = MOGUL_MIN_COSTS.slice(0, location + 1).reduce((a, b) => a + b, 0);
  if (!trusted && (earned < minEarned * 0.999 || money > (earned + gambleWon) * 1.0001 + 1))
    return res.status(400).json({ error: 'Spielstand unplausibel' });
  // Jetons: verdient nur durch Antippen (max. ~2 je 25 Münzen + seltene Jeton-Münzen), große Gewinne,
  // Jackpots und das Glücksrad. Gewinne am High-Roller-Automaten zählen extra.
  const st = save.stats || {};
  const num = (v) => (Number.isFinite(v) && v > 0 ? v : 0);
  const jetons = save.jetons === undefined ? 0 : save.jetons;
  if (typeof jetons !== 'number' || !Number.isFinite(jetons) || jetons < 0)
    return res.status(400).json({ error: 'Ungültige Jetons' });
  const jEarned = num(st.jetonsEarned);
  const jWon = num(st.jetonsWon);
  const jMax = num(st.finds) * 0.2 + num(st.bets) + num(st.wheelSpins) * 10 + num(st.jackpots) * 25 + 100;
  if (!trusted && (jEarned > jMax || jWon > Math.max(5000, jEarned * 50) || jetons > jEarned + jWon + 1))
    return res.status(400).json({ error: 'Spielstand unplausibel' });

  const prev = await pool.query(
    `SELECT mogul_location, mogul_earned, save_data, EXTRACT(EPOCH FROM (NOW() - save_at)) * 1000 AS since,
       EXTRACT(EPOCH FROM (NOW() - created_at)) AS age FROM users WHERE id = $1`,
    [req.user.id]);
  const p = prev.rows[0];
  if (!p) return res.status(404).json({ error: 'User nicht gefunden' });
  if (!reset && p.since !== null && parseFloat(p.since) < MOGUL_MIN_SAVE_INTERVAL_MS)
    return res.json({ success: true, skipped: true });

  // Wachstums-Grenze (nicht beim Zurücksetzen). Ohne bisherigen Spielstand zählt ab Account-Erstellung,
  // höchstens 10 Minuten – so kann auch ein frischer Account nicht sofort Billionen melden.
  if (!reset && !trusted) {
    let prevStats = {};
    try { prevStats = (p.save_data && JSON.parse(p.save_data).stats) || {}; } catch {}
    const hasPrev = p.since !== null && !!p.save_data;
    const prevEarned = hasPrev ? Number(prevStats.totalEarned) || 0 : 0;
    const prevGamble = hasPrev ? Number(prevStats.gambleWon) || 0 : 0;
    const sinceSec = hasPrev ? parseFloat(p.since) / 1000 : Math.min(600, parseFloat(p.age) || 0);
    const tooFast = earned > growthLimit(prevEarned, sinceSec)
      || gambleWon > Math.max(growthLimit(prevGamble, sinceSec), earned * 30 + GROWTH_FREE);
    if (tooFast) {
      console.warn(`⚠️ Spielstand abgelehnt (zu schnelles Wachstum): ${req.user.username} ${prevEarned} -> ${earned} in ${Math.round(sinceSec)} s`);
      return res.status(400).json({ error: 'Spielstand unplausibel (zu schnelles Wachstum)' });
    }
  }

  // Beste Combo: zählt unbegrenzt, kann aber nie höher sein als alle aufgehobenen Münzen
  const finds = Math.max(0, Math.floor(Number(save.stats && save.stats.finds) || 0));
  const maxCombo = Math.max(0, Math.min(finds, 1e6, Math.floor(Number(save.stats && save.stats.maxCombo) || 0)));
  await pool.query(
    `UPDATE users SET save_data = $1, save_at = NOW(), last_seen = NOW(), mogul_location = $2, mogul_earned = $3, mogul_max_combo = $4 WHERE id = $5`,
    [raw, location, earned, maxCombo, req.user.id]);
  res.json({ success: true });
});

app.get('/api/mogul-leaderboard', auth, async (req, res) => {
  // Weitere Ranglisten: Werte kommen aus dem gespeicherten Spielstand
  const EXTRA = {
    bigwin: (sv) => Number(sv.stats && sv.stats.biggestWin) || 0,
    jackpots: (sv) => Number(sv.stats && sv.stats.jackpots) || 0,
    jetons: (sv) => Number(sv.stats && sv.stats.jetonsEarned) || 0,
    album: (sv) => Object.values(sv.album || {}).filter(n => n > 0).length,
  };
  if (EXTRA[req.query.by]) {
    const pick = EXTRA[req.query.by];
    const all = await pool.query(
      `SELECT id, username, mogul_location AS location, mogul_earned AS earned, COALESCE(mogul_max_combo, 0) AS max_combo, save_data
       FROM users WHERE is_admin = 0 AND save_data IS NOT NULL AND COALESCE(lb_hidden, FALSE) = FALSE`);
    const rows = all.rows.map(r => {
      let v = 0; try { v = pick(JSON.parse(r.save_data)); } catch {}
      return { id: r.id, username: r.username, location: r.location, earned: r.earned, max_combo: r.max_combo, value: Number.isFinite(v) ? v : 0 };
    }).filter(r => r.value > 0).sort((x, y) => y.value - x.value || y.earned - x.earned);
    const idx = rows.findIndex(r => r.id === req.user.id);
    const strip = ({ id, ...r }) => r;
    return res.json({ top: rows.slice(0, 50).map(strip), me: idx >= 0 ? { ...strip(rows[idx]), rank: idx + 1 } : null });
  }
  if (req.query.by === 'combo') {
    const top = await pool.query(
      `SELECT username, mogul_location AS location, mogul_earned AS earned, COALESCE(mogul_max_combo, 0) AS max_combo
       FROM users WHERE is_admin = 0 AND save_data IS NOT NULL AND COALESCE(lb_hidden, FALSE) = FALSE AND COALESCE(mogul_max_combo, 0) > 0
       ORDER BY mogul_max_combo DESC, mogul_earned DESC LIMIT 50`);
    const me = await pool.query(
      `SELECT u.username, u.mogul_location AS location, u.mogul_earned AS earned, COALESCE(u.mogul_max_combo, 0) AS max_combo,
         (SELECT COUNT(*) FROM users o WHERE o.is_admin = 0 AND o.save_data IS NOT NULL AND
            (COALESCE(o.mogul_max_combo, 0) > COALESCE(u.mogul_max_combo, 0) OR
             (COALESCE(o.mogul_max_combo, 0) = COALESCE(u.mogul_max_combo, 0) AND o.mogul_earned > u.mogul_earned))) + 1 AS rank
       FROM users u WHERE u.id = $1`, [req.user.id]);
    return res.json({ top: top.rows, me: me.rows[0] || null });
  }
  const top = await pool.query(
    `SELECT username, mogul_location AS location, mogul_earned AS earned, COALESCE(mogul_max_combo, 0) AS max_combo
     FROM users WHERE is_admin = 0 AND save_data IS NOT NULL AND COALESCE(lb_hidden, FALSE) = FALSE
     ORDER BY mogul_location DESC, mogul_earned DESC LIMIT 50`);
  const me = await pool.query(
    `SELECT u.username, u.mogul_location AS location, u.mogul_earned AS earned, COALESCE(u.mogul_max_combo, 0) AS max_combo,
       (SELECT COUNT(*) FROM users o WHERE o.is_admin = 0 AND o.save_data IS NOT NULL AND
          (o.mogul_location > u.mogul_location OR (o.mogul_location = u.mogul_location AND o.mogul_earned > u.mogul_earned))) + 1 AS rank
     FROM users u WHERE u.id = $1`, [req.user.id]);
  res.json({ top: top.rows, me: me.rows[0] || null });
});

// ─── Feedback ────────────────────────────────────────────────────────────────
// Wird gespeichert und – falls konfiguriert – per E-Mail verschickt (Resend).
// Render-Umgebungsvariablen: RESEND_API_KEY, FEEDBACK_EMAIL (Empfänger), optional FEEDBACK_FROM
const FEEDBACK_CATEGORIES = ['bug', 'idee', 'balancing', 'lob', 'sonstiges'];

const sendFeedbackMail = async (fb) => {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_EMAIL;
  if (!key || !to || typeof fetch !== 'function') return false;
  const stars = '★'.repeat(fb.rating) + '☆'.repeat(5 - fb.rating);
  const text = [
    `Neues Feedback von ${fb.username}`,
    `Bewertung: ${stars} (${fb.rating}/5)`,
    `Kategorie: ${fb.category}`,
    '',
    fb.message,
    '',
    `Spielstand: ${fb.context}`,
  ].join('\n');
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.FEEDBACK_FROM || 'Casino-Mogul <onboarding@resend.dev>',
        to: [to],
        subject: `🎰 Feedback (${fb.category}, ${fb.rating}/5) von ${fb.username}`,
        text,
      }),
    });
    if (!res.ok) console.error('Feedback-Mail fehlgeschlagen:', res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error('Feedback-Mail fehlgeschlagen:', e.message);
    return false;
  }
};

app.post('/api/feedback', auth, async (req, res) => {
  const { rating, category, message, context } = req.body || {};
  const msg = typeof message === 'string' ? message.trim() : '';
  if (msg.length < 3) return res.status(400).json({ error: 'Bitte schreib ein paar Worte' });
  if (msg.length > 2000) return res.status(400).json({ error: 'Maximal 2000 Zeichen' });
  const stars = Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : 3;
  const cat = FEEDBACK_CATEGORIES.includes(category) ? category : 'sonstiges';
  const ctx = typeof context === 'string' ? context.slice(0, 300) : '';
  const recent = await pool.query(
    `SELECT COUNT(*)::int AS n FROM feedback WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`, [req.user.id]);
  if (recent.rows[0].n >= 5) return res.status(429).json({ error: 'Danke! Du hast schon viel Feedback geschickt – bitte später wieder.' });
  const fb = { username: req.user.username, rating: stars, category: cat, message: msg, context: ctx };
  await pool.query(
    `INSERT INTO feedback (user_id, username, rating, category, message, context) VALUES ($1, $2, $3, $4, $5, $6)`,
    [req.user.id, fb.username, stars, cat, msg, ctx]);
  const mailed = await sendFeedbackMail(fb);
  res.json({ success: true, mailed });
});

app.get('/api/admin/feedback', adminAuth, async (req, res) => {
  const r = await pool.query(`SELECT * FROM feedback ORDER BY created_at DESC LIMIT 200`);
  res.json(r.rows);
});

// ─── Gemeinsamer Jackpot ─────────────────────────────────────────────────────
// Jede Wette aller Spieler füllt den Topf (der Client meldet gesammelte Beiträge alle paar Sekunden).
// Das Knacken würfelt der Client aus; der Server zahlt aus, begrenzt auf das 500-Fache des
// Max-Einsatzes des Gewinners (damit Anfänger nicht die Billionen der Profis abräumen) und
// erlaubt pro Spieler höchstens einen Jackpot alle 2 Stunden.
const JACKPOT_SEED = 1000;
const JACKPOT_COOLDOWN_MIN = 120;

app.get('/api/jackpot', auth, async (req, res) => {
  const p = await pool.query(`SELECT pool FROM jackpot WHERE id = 1`);
  const w = await pool.query(`SELECT id, username, amount, game, created_at FROM jackpot_wins ORDER BY id DESC LIMIT 10`);
  res.json({ pool: p.rows[0] ? p.rows[0].pool : JACKPOT_SEED, wins: w.rows });
});

app.post('/api/jackpot/contribute', auth, async (req, res) => {
  const amount = Number(req.body && req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Ungültiger Betrag' });
  // Plausibilität: niemand kann mehr einzahlen, als er insgesamt verdient hat
  const u = await pool.query(`SELECT COALESCE(mogul_earned, 0) AS earned FROM users WHERE id = $1`, [req.user.id]);
  const cap = Math.max(50, (u.rows[0] ? u.rows[0].earned : 0) * 0.05);
  const add = Math.min(amount, cap);
  const r2 = await pool.query(`UPDATE jackpot SET pool = pool + $1 WHERE id = 1 RETURNING pool`, [add]);
  res.json({ pool: r2.rows[0].pool });
});

app.post('/api/jackpot/claim', auth, async (req, res) => {
  const game = typeof req.body?.game === 'string' ? req.body.game.slice(0, 40) : 'casino';
  const maxBet = Number(req.body && req.body.maxBet);
  if (!Number.isFinite(maxBet) || maxBet <= 0) return res.status(400).json({ error: 'Ungültig' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const u = await client.query(
      `SELECT username, COALESCE(mogul_earned, 0) AS earned,
         EXTRACT(EPOCH FROM (NOW() - last_jackpot_at)) / 60 AS mins
       FROM users WHERE id = $1 FOR UPDATE`, [req.user.id]);
    const me = u.rows[0];
    if (!me) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'User nicht gefunden' }); }
    if (me.mins !== null && parseFloat(me.mins) < JACKPOT_COOLDOWN_MIN) {
      await client.query('ROLLBACK');
      return res.json({ won: false, cooldown: Math.ceil(JACKPOT_COOLDOWN_MIN - parseFloat(me.mins)) });
    }
    const j = await client.query(`SELECT pool FROM jackpot WHERE id = 1 FOR UPDATE`);
    const potNow = j.rows[0] ? j.rows[0].pool : JACKPOT_SEED;
    const safeBet = Math.min(maxBet, Math.max(5, me.earned)); // Max-Einsatz kann nicht höher sein als alles Verdiente
    const amount = Math.min(potNow, Math.max(JACKPOT_SEED, safeBet * 500));
    const rest = Math.max(JACKPOT_SEED, potNow - amount);
    await client.query(`UPDATE jackpot SET pool = $1 WHERE id = 1`, [rest]);
    await client.query(`UPDATE users SET last_jackpot_at = NOW() WHERE id = $1`, [req.user.id]);
    await client.query(`INSERT INTO jackpot_wins (user_id, username, amount, game) VALUES ($1, $2, $3, $4)`,
      [req.user.id, me.username, amount, game]);
    await client.query('COMMIT');
    res.json({ won: true, amount, pool: rest });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Serverfehler' });
  } finally {
    client.release();
  }
});

// Leaderboard
app.get('/api/leaderboard', auth, async (req, res) => {
  const result = await pool.query(
    `SELECT username, balance, total_bets, total_wins, total_losses, total_won, biggest_win,
     COALESCE(prestige_count, 0) AS prestige_count
     FROM users WHERE is_admin = 0 ORDER BY prestige_count DESC, balance DESC LIMIT 20`
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
  } catch (e) {
    if (e && e.code === '23505') return res.status(400).json({ error: 'Benutzername bereits vergeben' });
    res.status(503).json({ error: 'Server-Problem – bitte gleich nochmal versuchen.' });
  }
});

// Passwort ändern
app.post('/api/change-password', auth, async (req, res) => {
  // Eingeloggt reicht – das alte Passwort muss man nicht kennen (z. B. vergessen)
  const { newPassword } = req.body;
  if (typeof newPassword !== 'string' || newPassword.length < 4)
    return res.status(400).json({ error: 'Passwort zu kurz (min. 4)' });
  if (newPassword.length > 200) return res.status(400).json({ error: 'Passwort zu lang' });
  const hash = bcrypt.hashSync(newPassword, 10);
  await pool.query(`UPDATE users SET password = $1 WHERE id = $2`, [hash, req.user.id]);
  res.json({ success: true });
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


// ═══ Postfach: Admin-Aktionen & Ankündigung für den Spieler ═════════════════
const ADMIN_ACTION_TYPES = ['money', 'jetons', 'location', 'vip', 'reset', 'replace', 'income', 'message'];
app.get('/api/inbox', auth, async (req, res) => {
  const acts = await pool.query(
    `UPDATE admin_actions SET applied_at = NOW() WHERE user_id = $1 AND applied_at IS NULL RETURNING id, action`, [req.user.id]);
  if (acts.rows.length) await pool.query(`UPDATE users SET trust_until = NOW() + INTERVAL '10 minutes' WHERE id = $1`, [req.user.id]);
  await pool.query(`UPDATE users SET last_seen = NOW() WHERE id = $1`, [req.user.id]);
  const ann = await pool.query(`SELECT value FROM settings WHERE key = 'announcement'`);
  let announcement = null;
  try { announcement = ann.rows[0] ? JSON.parse(ann.rows[0].value) : null; } catch {}
  res.json({
    actions: acts.rows.map(r => { try { return { id: r.id, ...JSON.parse(r.action) }; } catch { return null; } }).filter(Boolean),
    announcement,
  });
});

// ═══ Admin-Menü ══════════════════════════════════════════════════════════════
const SERVER_STARTED = Date.now();
const userId = (req) => parseInt(req.params.id, 10);
const queueAction = (uid, action) => pool.query(`INSERT INTO admin_actions (user_id, action) VALUES ($1, $2)`, [uid, JSON.stringify(action)]);

// 1 Übersicht
app.get('/api/admin/overview', adminAuth, async (req, res) => {
  const q = (sql) => pool.query(sql).then(r => r.rows[0]);
  const [users, online, day, fresh, banned, fb, jp, wins, db] = await Promise.all([
    q(`SELECT COUNT(*)::int AS n FROM users WHERE is_admin = 0`),
    q(`SELECT COUNT(*)::int AS n FROM users WHERE is_admin = 0 AND last_seen > NOW() - INTERVAL '5 minutes'`),
    q(`SELECT COUNT(*)::int AS n FROM users WHERE is_admin = 0 AND last_seen > NOW() - INTERVAL '24 hours'`),
    q(`SELECT COUNT(*)::int AS n FROM users WHERE is_admin = 0 AND created_at > NOW() - INTERVAL '24 hours'`),
    q(`SELECT COUNT(*)::int AS n FROM users WHERE banned = TRUE`),
    q(`SELECT COUNT(*)::int AS n FROM feedback WHERE COALESCE(done, FALSE) = FALSE`),
    q(`SELECT pool FROM jackpot WHERE id = 1`),
    q(`SELECT COUNT(*)::int AS n FROM jackpot_wins`),
    q(`SELECT pg_database_size(current_database())::bigint AS bytes`),
  ]);
  res.json({
    users: users.n, online: online.n, active24h: day.n, new24h: fresh.n, banned: banned.n, openFeedback: fb.n,
    jackpot: jp ? jp.pool : 0, jackpotWins: wins.n, dbBytes: Number(db.bytes), uptimeSec: Math.round((Date.now() - SERVER_STARTED) / 1000),
  });
});

// 2–4 Spielerliste (Suche, Sortierung, online)
app.get('/api/admin/players', adminAuth, async (req, res) => {
  const search = typeof req.query.q === 'string' ? `%${req.query.q.trim()}%` : '%';
  const sorts = { last_seen: 'last_seen DESC NULLS LAST', created: 'created_at DESC', earned: 'mogul_earned DESC', name: 'username ASC', location: 'mogul_location DESC, mogul_earned DESC' };
  const order = sorts[req.query.sort] || sorts.last_seen;
  const r = await pool.query(
    `SELECT id, username, is_admin, created_at, last_seen, mogul_location AS location, mogul_earned AS earned,
       COALESCE(mogul_max_combo, 0) AS max_combo, COALESCE(banned, FALSE) AS banned, COALESCE(lb_hidden, FALSE) AS lb_hidden,
       (last_seen > NOW() - INTERVAL '5 minutes') AS online
     FROM users WHERE username ILIKE $1 ORDER BY ${order} LIMIT 500`, [search]);
  res.json(r.rows);
});

// 5 Spieler-Details inkl. Spielstand
app.get('/api/admin/player/:id', adminAuth, async (req, res) => {
  const r = await pool.query(
    `SELECT id, username, is_admin, created_at, last_seen, save_at, mogul_location AS location, mogul_earned AS earned,
       COALESCE(mogul_max_combo, 0) AS max_combo, COALESCE(banned, FALSE) AS banned, COALESCE(lb_hidden, FALSE) AS lb_hidden, save_data
     FROM users WHERE id = $1`, [userId(req)]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Spieler nicht gefunden' });
  const { save_data, ...user } = r.rows[0];
  let save = null; try { save = save_data ? JSON.parse(save_data) : null; } catch {}
  const pending = await pool.query(`SELECT id, action, created_at FROM admin_actions WHERE user_id = $1 AND applied_at IS NULL ORDER BY id`, [user.id]);
  const fbs = await pool.query(`SELECT id, rating, category, message, created_at FROM feedback WHERE user_id = $1 ORDER BY id DESC LIMIT 20`, [user.id]);
  res.json({ user, save, pending: pending.rows, feedback: fbs.rows });
});

// 6/7 Passwort setzen
app.post('/api/admin/player/:id/password', adminAuth, async (req, res) => {
  const pw = req.body && req.body.password;
  if (typeof pw !== 'string' || pw.length < 4 || pw.length > 200) return res.status(400).json({ error: 'Passwort: 4–200 Zeichen' });
  const r = await pool.query(`UPDATE users SET password = $1 WHERE id = $2 RETURNING username`, [bcrypt.hashSync(pw, 10), userId(req)]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Spieler nicht gefunden' });
  res.json({ success: true });
});

// 8 Namen ändern
app.post('/api/admin/player/:id/username', adminAuth, async (req, res) => {
  const name = req.body && typeof req.body.username === 'string' ? req.body.username.trim() : '';
  if (name.length < 3 || name.length > 30) return res.status(400).json({ error: 'Name: 3–30 Zeichen' });
  try {
    const r = await pool.query(`UPDATE users SET username = $1 WHERE id = $2 RETURNING id`, [name, userId(req)]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Spieler nicht gefunden' });
    res.json({ success: true });
  } catch (e) {
    if (e && e.code === '23505') return res.status(400).json({ error: 'Name schon vergeben' });
    throw e;
  }
});

// 9–13, 18 Spielstand ändern (wird beim nächsten Online-Moment im Spiel angewendet)
app.post('/api/admin/player/:id/action', adminAuth, async (req, res) => {
  const a = req.body && req.body.action;
  if (!a || !ADMIN_ACTION_TYPES.includes(a.type)) return res.status(400).json({ error: 'Unbekannte Aktion' });
  if (a.type === 'replace' && (!a.save || typeof a.save !== 'object')) return res.status(400).json({ error: 'Spielstand fehlt' });
  const exists = await pool.query(`SELECT id FROM users WHERE id = $1`, [userId(req)]);
  if (!exists.rows[0]) return res.status(404).json({ error: 'Spieler nicht gefunden' });
  await queueAction(userId(req), a);
  if (a.type === 'replace' || a.type === 'reset') {
    await pool.query(`UPDATE users SET save_data = $1, save_at = NOW(), trust_until = NOW() + INTERVAL '10 minutes' WHERE id = $2`,
      [a.type === 'reset' ? null : JSON.stringify(a.save), userId(req)]);
  }
  res.json({ success: true });
});
app.delete('/api/admin/action/:aid', adminAuth, async (req, res) => {
  await pool.query(`DELETE FROM admin_actions WHERE id = $1 AND applied_at IS NULL`, [parseInt(req.params.aid, 10)]);
  res.json({ success: true });
});

// 14–16 Sperren, aus Rangliste ausblenden, Admin-Rechte
app.post('/api/admin/player/:id/flags', adminAuth, async (req, res) => {
  const b = req.body || {};
  const sets = []; const vals = [];
  if (typeof b.banned === 'boolean') { vals.push(b.banned); sets.push(`banned = $${vals.length}`); }
  if (typeof b.lb_hidden === 'boolean') { vals.push(b.lb_hidden); sets.push(`lb_hidden = $${vals.length}`); }
  if (typeof b.is_admin === 'boolean') { vals.push(b.is_admin ? 1 : 0); sets.push(`is_admin = $${vals.length}`); }
  if (!sets.length) return res.status(400).json({ error: 'Nichts zu ändern' });
  vals.push(userId(req));
  await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${vals.length} AND username <> 'admin'`, vals);
  res.json({ success: true });
});

// 17 Account löschen
app.delete('/api/admin/player/:id', adminAuth, async (req, res) => {
  await pool.query(`DELETE FROM admin_actions WHERE user_id = $1`, [userId(req)]);
  await pool.query(`DELETE FROM users WHERE id = $1 AND username <> 'admin'`, [userId(req)]);
  res.json({ success: true });
});

// 19 Feedback
app.post('/api/admin/feedback/:id/done', adminAuth, async (req, res) => {
  await pool.query(`UPDATE feedback SET done = NOT COALESCE(done, FALSE) WHERE id = $1`, [parseInt(req.params.id, 10)]);
  res.json({ success: true });
});
app.delete('/api/admin/feedback/:id', adminAuth, async (req, res) => {
  await pool.query(`DELETE FROM feedback WHERE id = $1`, [parseInt(req.params.id, 10)]);
  res.json({ success: true });
});

// 20 Jackpot
app.get('/api/admin/jackpot', adminAuth, async (req, res) => {
  const p = await pool.query(`SELECT pool FROM jackpot WHERE id = 1`);
  const w = await pool.query(`SELECT id, username, amount, game, created_at FROM jackpot_wins ORDER BY id DESC LIMIT 50`);
  res.json({ pool: p.rows[0] ? p.rows[0].pool : 0, wins: w.rows });
});
app.post('/api/admin/jackpot', adminAuth, async (req, res) => {
  const v = Number(req.body && req.body.pool);
  if (!Number.isFinite(v) || v < 0) return res.status(400).json({ error: 'Ungültiger Betrag' });
  await pool.query(`INSERT INTO jackpot (id, pool) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET pool = $1`, [v]);
  res.json({ success: true });
});

// 21 Ankündigung an alle
app.post('/api/admin/announce', adminAuth, async (req, res) => {
  const text = req.body && typeof req.body.text === 'string' ? req.body.text.trim().slice(0, 300) : '';
  if (!text) {
    await pool.query(`DELETE FROM settings WHERE key = 'announcement'`);
    return res.json({ success: true });
  }
  await pool.query(`INSERT INTO settings (key, value) VALUES ('announcement', $1) ON CONFLICT (key) DO UPDATE SET value = $1`,
    [JSON.stringify({ id: Date.now(), text })]);
  res.json({ success: true });
});

// 22 Geschenk an alle (Minuten Einkommen oder Jetons)
app.post('/api/admin/gift-all', adminAuth, async (req, res) => {
  const b = req.body || {};
  const type = b.type === 'jetons' ? 'jetons' : 'income';
  const amount = Math.floor(Number(b.amount));
  if (!Number.isFinite(amount) || amount <= 0 || amount > (type === 'jetons' ? 100000 : 24 * 60)) return res.status(400).json({ error: 'Ungültige Menge' });
  const action = type === 'jetons' ? { type: 'jetons', mode: 'add', amount, note: b.note || 'Geschenk' } : { type: 'income', seconds: amount * 60, note: b.note || 'Geschenk' };
  const r = await pool.query(
    `INSERT INTO admin_actions (user_id, action) SELECT id, $1 FROM users WHERE is_admin = 0 AND COALESCE(banned, FALSE) = FALSE RETURNING id`,
    [JSON.stringify(action)]);
  res.json({ success: true, count: r.rows.length });
});

app.listen(5000, () => console.log('✅ Server läuft auf Port 5000'));
``