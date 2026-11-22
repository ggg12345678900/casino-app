import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';
import * as E from './economy';

const LOCAL_KEY = (userId) => `mogul_save_${userId}`;
const TICK_MS = 100;
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
export default function useGame(user, { onAchievement, onBigWin } = {}) {
  const [state, setState] = useState(null);
  const [welcome, setWelcome] = useState(null); // { seconds, earned }
  const stateRef = useRef(null);
  stateRef.current = state;
  const cbRef = useRef({});
  cbRef.current = { onAchievement, onBigWin };

  // ── Laden: neuerer Stand gewinnt (lokal vs. Server) ──────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = readLocal(user.id);
      let remote = null;
      try {
        const res = await api.getSave();
        if (res && res.save) remote = res.save;
      } catch {}
      if (cancelled) return;
      const pick = [local, remote].filter(Boolean).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))[0];
      const loaded = E.migrate(pick);
      const off = E.offlineProgress(loaded);
      if (off.seconds > 60 && off.earned > 0) setWelcome({ seconds: off.seconds, earned: off.earned });
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
    api.putSave(snap, keepalive).catch(() => {});
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
  const buyVip = useCallback(() => apply(s => E.buyVip(s)), [apply]);
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
  const addResult = useCallback((didWin, amount, game, bet, multiplier = 1) => {
    setState(s => {
      const next = E.recordBet(s, didWin, amount, multiplier);
      stateRef.current = next;
      return next;
    });
    if (didWin && multiplier >= 10 && cbRef.current.onBigWin) cbRef.current.onBigWin({ amount, multiplier, game });
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
    api.putSave(fresh, false, true).catch(() => {});
  }, [user.id]);

  return {
    state, derived: state ? E.derive(state) : null, welcome, dismissWelcome: () => setWelcome(null),
    pickup, pickCharm, buyVip, openSack, spinWheel, buyHelper, buyTool, moveLocation, setBalance, addResult, resetGame, saveNow: saveServer,
  };
}
