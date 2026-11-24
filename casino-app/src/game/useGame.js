import { useState, useEffect, useRef, useCallback } from 'react';
import { api, hasToken } from '../api';
import * as E from './economy';

const LOCAL_KEY = (userId) => `mogul_save_${userId}`;
const TICK_MS = 100;
// Online: gemeinsamer Jackpot über den Server. Demo: eigener Topf im Browser.
const ONLINE = process.env.REACT_APP_DEMO !== 'true';
const LOCAL_SAVE_MS = 5000;
const SERVER_SAVE_MS = 30000;

const readLocal = (userId) => {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY(userId))); } catch { return null; }
};
const writeLocal = (userId, s) => {
  try { localStorage.setItem(LOCAL_KEY(userId), JSON.stringify(s)); } catch {}
};

/**
 * Hält den kompletten Spielstand, lässt die Zeit laufen und speichert.
 * Events (Funde, Glücksbringer, Level-Ups) gehen über onEvent an die UI.
 */
export default function useGame(user, { onAchievement, onBigWin, onJackpot, onJackpotNews, onJackpotCooldown, onInsurance, onJetonJackpot, onAdmin } = {}) {
  const [state, setState] = useState(null);
  const [welcome, setWelcome] = useState(null); // { seconds, earned }
  const stateRef = useRef(null);
  stateRef.current = state;
  const cbRef = useRef({});
  cbRef.current = { onAchievement, onBigWin, onJackpot, onJackpotNews, onJackpotCooldown, onInsurance, onJetonJackpot, onAdmin };
  const [globalJp, setGlobalJp] = useState({ pool: null, wins: [] });
  const pendingRef = useRef(0);       // noch nicht gemeldete Jackpot-Einzahlungen
  const lastWinRef = useRef(null);    // höchste bekannte Gewinn-ID
  const lastWinPostRef = useRef(0);   // letzter gemeldeter Live-Gewinn

  // ── Laden: neuerer Stand gewinnt (lokal vs. Server) ──────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = readLocal(user.id);
      let remote = null;
      try {
        const res = hasToken() ? await api.getSave() : null;
        if (res && res.save) remote = res.save;
      } catch {}
      if (cancelled) return;
      const pick = [local, remote].filter(Boolean).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))[0];
      const loaded = E.migrate(pick);
      const off = E.offlineProgress(loaded);
      if (off.seconds > 60 && off.earned > 0) setWelcome({ seconds: off.seconds, away: off.away, earned: off.earned });
      setState({ ...off.state, savedAt: Date.now() });
    })();
    return () => { cancelled = true; };
  }, [user.id]);

  // ── Zeit läuft ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!state) return undefined;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 5);
      last = now;
      setState(s => (s ? E.tick(s, dt) : s));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [state === null]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Speichern ────────────────────────────────────────────────────────
  const saveServer = useCallback((keepalive = false) => {
    const s = stateRef.current;
    if (!s) return;
    const snap = { ...s, savedAt: Date.now() };
    writeLocal(user.id, snap);
    if (hasToken()) api.putSave(snap, keepalive).catch(() => {});
  }, [user.id]);

  useEffect(() => {
    if (!state) return undefined;
    const a = setInterval(() => { if (stateRef.current) writeLocal(user.id, { ...stateRef.current, savedAt: Date.now() }); }, LOCAL_SAVE_MS);
    const b = setInterval(() => saveServer(), SERVER_SAVE_MS);
    const onHide = () => { if (document.visibilityState === 'hidden') saveServer(true); };
    const onUnload = () => saveServer(true);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      clearInterval(a); clearInterval(b);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [state === null, saveServer]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Aktionen ─────────────────────────────────────────────────────────
  // pickup() rechnet synchron mit dem aktuellen Stand, damit die UI das Ergebnis sofort anzeigen kann
  const pickup = useCallback((coinId, gold, combo = 0) => {
    const s = stateRef.current;
    if (!s) return null;
    const out = E.pickup(s, coinId, gold, combo);
    if (!out) return null;
    const { state: next, result } = out;
    // Zwischenzeitliche Zeit-Ticks nicht verlieren: nur die Differenz anwenden
    setState(cur => ({
      ...next,
      money: cur.money + (next.money - s.money),
      stats: { ...next.stats, totalEarned: cur.stats.totalEarned + (next.stats.totalEarned - s.stats.totalEarned), playTime: cur.stats.playTime },
    }));
    stateRef.current = next;
    return result;
  }, []);

  const apply = useCallback((fn) => {
    const s = stateRef.current;
    if (!s) return false;
    const next = fn(s);
    if (!next) return false;
    stateRef.current = next;
    setState(next);
    return true;
  }, []);

  const pickCharm = useCallback((id) => apply(s => E.pickCharm(s, id)), [apply]);
  const claimQuest = useCallback(() => apply(s => E.claimQuest(s)), [apply]);
  const buyFinger = useCallback(() => apply(s => E.buyFinger(s)), [apply]);
  const setProfile = useCallback((patch) => apply(s => E.setProfile(s, patch)), [apply]);
  const markSecret = useCallback((key, value = true) => apply(s => E.markSecret(s, key, value)), [apply]);
  const addMiss = useCallback(() => apply(s => ({ ...s, stats: { ...s.stats, misses: (s.stats.misses || 0) + 1 } })), [apply]);
  const buySkin = useCallback((kind, id) => apply(s => E.buySkin(s, kind, id)), [apply]);
  const pickJeton = useCallback(() => apply(s => E.pickJeton(s)), [apply]);
  const buyJeton = useCallback((id) => apply(s => E.buyJetonItem(s, id)), [apply]);
  const useBonusSpins = useCallback(() => {
    const n = (stateRef.current && stateRef.current.bonusSpins) || 0;
    if (n > 0) apply(s => ({ ...s, bonusSpins: 0, stats: { ...s.stats, bonusUsed: (s.stats.bonusUsed || 0) + 1 } }));
    return n;
  }, [apply]);
  // High-Roller-Automat: spielt mit Jetons statt Geld
  const setJetons = useCallback((v) => {
    setState(s => {
      const j = typeof v === 'function' ? v(s.jetons || 0) : v;
      const next = { ...s, jetons: Math.max(0, j) };
      stateRef.current = next;
      return next;
    });
  }, []);
  const addJetonResult = useCallback((didWin, amount, game, bet = 0, multiplier = 1) => {
    let pot = 0;
    setState(s => { const out = E.recordJetonBet(s, didWin, amount, multiplier, bet); pot = out.pot; stateRef.current = out.state; return out.state; });
    setTimeout(() => { if (pot > 0 && cbRef.current.onJetonJackpot) cbRef.current.onJetonJackpot(pot); }, 0);
  }, []);
  const skipTutorial = useCallback(() => apply(s => ({ ...s, tutorialSkipped: true })), [apply]);
  const buyVip = useCallback((n = 1) => apply(s => E.buyVip(s, n)), [apply]);
  const buyHelper = useCallback((id, n) => apply(s => E.buyHelper(s, id, n)), [apply]);
  const buyTool = useCallback((id) => apply(s => E.buyTool(s, id)), [apply]);
  const moveLocation = useCallback(() => {
    const ok = apply(s => E.moveLocation(s));
    if (ok) saveServer();
    return ok;
  }, [apply, saveServer]);

  // Schnittstelle für die Casino-Spiele (balance / setBalance / addResult)
  const setBalance = useCallback((v) => {
    setState(s => {
      const money = typeof v === 'function' ? v(s.money) : v;
      const next = { ...s, money: Math.max(0, money) };
      stateRef.current = next;
      return next;
    });
  }, []);
  const addResult = useCallback((didWin, amount, game, bet = 0, multiplier = 1) => {
    const s0 = stateRef.current;
    // Jackpot hier auswürfeln (nicht im State-Updater), damit das Ergebnis eindeutig ist
    const hit = !!s0 && ((String(game).startsWith('slots') && multiplier >= 250) || Math.random() < E.jackpotChance(s0, bet));
    const pool = s0 ? E.jackpotPool(s0) + Math.max(0, bet) * E.JACKPOT_SHARE : 0;
    const localHit = hit && !ONLINE;
    if (ONLINE) pendingRef.current += Math.max(0, bet) * E.JACKPOT_SHARE;
    // Versicherung (Jeton-Shop): einmal pro Stunde einen Verlust ab halbem Max-Einsatz erstatten
    const now = Date.now();
    const insured = !!s0 && !didWin && amount > 0 && bet > 0 && !!(s0.jetonShop || {}).insurance
      && (s0.insuranceReadyAt || 0) <= now && bet >= E.derive(s0).maxBet * 0.5;
    setState(s => {
      let next = E.recordBet(s, didWin, amount, multiplier, bet, localHit);
      if (insured) next = { ...next, money: next.money + amount, insuranceReadyAt: now + E.INSURANCE_COOLDOWN_MS };
      stateRef.current = next;
      return next;
    });
    if (insured && cbRef.current.onInsurance) cbRef.current.onInsurance(amount);
    if (didWin && multiplier >= 10 && cbRef.current.onBigWin && !hit) cbRef.current.onBigWin({ amount, multiplier, game });
    // Echte Gewinne für den Live-Feed melden (ab ×2, höchstens alle 4 s)
    if (ONLINE && didWin && multiplier >= 2 && amount > 0 && hasToken() && Date.now() - lastWinPostRef.current > 4000) {
      lastWinPostRef.current = Date.now();
      api.postWin(String(game), +amount, +multiplier).catch(() => {});
    }
    if (localHit && cbRef.current.onJackpot) cbRef.current.onJackpot({ amount: pool, game });
    if (hit && ONLINE && s0) {
      // Gemeinsamen Jackpot beim Server einfordern
      api.jackpotClaim(game, E.derive(s0).maxBet).then(res => {
        if (res && res.won) {
          setState(s => { const next = E.creditJackpot(s, res.amount); stateRef.current = next; return next; });
          setGlobalJp(g => ({ ...g, pool: res.pool }));
          if (cbRef.current.onJackpot) cbRef.current.onJackpot({ amount: res.amount, game });
        } else if (res && res.cooldown && cbRef.current.onJackpotCooldown) {
          cbRef.current.onJackpotCooldown(res.cooldown);
        }
      }).catch(() => {});
    }
  }, []);

  const openSack = useCallback(() => {
    const s = stateRef.current;
    if (!s) return null;
    const out = E.openSack(s);
    stateRef.current = out.state;
    setState(out.state);
    return out.result;
  }, []);

  const spinWheel = useCallback(() => {
    const s = stateRef.current;
    if (!s) return null;
    const out = E.spinWheel(s);
    if (!out) return null;
    stateRef.current = out.state;
    setState(out.state);
    return out;
  }, []);

  // Gemeinsamer Jackpot: Einzahlungen melden (10 s) und Topf + Gewinner abfragen (15 s)
  useEffect(() => {
    if (!ONLINE || !state) return undefined;
    const poll = () => hasToken() && api.jackpot().then(res => {
      if (!res || res.error) return;
      const wins = res.wins || [];
      const maxId = wins.reduce((m, w) => Math.max(m, w.id), 0);
      if (lastWinRef.current !== null) {
        wins.filter(w => w.id > lastWinRef.current && w.username !== user.username)
          .forEach(w => cbRef.current.onJackpotNews && cbRef.current.onJackpotNews(w));
      }
      lastWinRef.current = Math.max(lastWinRef.current || 0, maxId);
      setGlobalJp({ pool: res.pool, wins });
    }).catch(() => {});
    const flush = () => {
      const amount = pendingRef.current;
      if (amount <= 0 || !hasToken()) return;
      pendingRef.current = 0;
      api.jackpotContribute(amount).then(res => { if (res && res.pool) setGlobalJp(g => ({ ...g, pool: res.pool })); })
        .catch(() => { pendingRef.current += amount; });
    };
    poll();
    const a = setInterval(flush, 10000);
    const b = setInterval(poll, 15000);
    return () => { clearInterval(a); clearInterval(b); flush(); };
  }, [state === null, user.username]); // eslint-disable-line react-hooks/exhaustive-deps

  // Postfach: Änderungen aus dem Admin-Menü und Ankündigungen (alle 20 s)
  const [announcement, setAnnouncement] = useState(null);
  useEffect(() => {
    if (!ONLINE || !state) return undefined;
    let stop = false;
    const check = () => hasToken() && api.inbox().then(res => {
      if (stop || !res || res.error) return;
      setAnnouncement(res.announcement || null);
      const acts = res.actions || [];
      if (!acts.length) return;
      let s = stateRef.current;
      acts.forEach(a => { s = E.applyAdminAction(s, a); });
      stateRef.current = s;
      setState(s);
      acts.forEach(a => cbRef.current.onAdmin && cbRef.current.onAdmin(a));
      setTimeout(() => saveServer(), 500);
    }).catch(() => {});
    check();
    const id = setInterval(check, 20000);
    return () => { stop = true; clearInterval(id); };
  }, [state === null, saveServer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Erfolge prüfen (jede Sekunde)
  useEffect(() => {
    if (!state) return undefined;
    const id = setInterval(() => {
      const s = stateRef.current;
      if (!s) return;
      const list = E.newAchievements(s);
      if (!list.length) return;
      setState(cur => E.unlockAchievements(cur, list));
      list.forEach(a => cbRef.current.onAchievement && cbRef.current.onAchievement(a));
    }, 1000);
    return () => clearInterval(id);
  }, [state === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetGame = useCallback(() => {
    const fresh = E.newGame();
    stateRef.current = fresh;
    setState(fresh);
    writeLocal(user.id, fresh);
    if (hasToken()) api.putSave(fresh, false, true).catch(() => {});
  }, [user.id]);

  return {
    state, derived: state ? E.derive(state) : null, welcome, announcement,
    jackpot: state ? { online: ONLINE, pool: ONLINE ? (globalJp.pool ?? E.JACKPOT_SEED_ONLINE) : E.jackpotPool(state), wins: globalJp.wins } : null, dismissWelcome: () => setWelcome(null),
    pickup, pickCharm, claimQuest, skipTutorial, pickJeton, buyJeton, buyFinger, setProfile, markSecret, addMiss, buySkin, useBonusSpins, setJetons, addJetonResult, buyVip, openSack, spinWheel, buyHelper, buyTool, moveLocation, setBalance, addResult, resetGame, saveNow: saveServer,
  };
}
