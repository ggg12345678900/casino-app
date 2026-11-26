import React, { useState, useCallback, useEffect, useRef } from 'react';
import './game.css';
import useGame from './useGame';
import { ADMIN_ACTION_TEXT, fingerEvery, LOCATIONS, fmtMoney, fmtTime, fmt, HELPERS, nextMilestone, OFFLINE_CAP_SEC, QUESTS, questDone, isUnlocked, jetonsOn, HIGHROLLER_BETS, TOOLS, helperCostN, unlocksAfter, UNLOCK_INFO } from './economy';
import SearchView from './SearchView';
import Shop from './Shop';
import { LocationsView, CasinoView, CollectionView, LeaderboardView, StatsView, GAME_INFO, coinRange, VipCard, fmtJetons, JetonShop } from './Views';
import TreeView from './TreeView';
import TestKit from './TestKit';
import { TREE, treeOwned, treeCanReach } from './tree';
import { SLOT_THEMES } from './slotThemes';
import Slots from './Slots';
import Feedback from './Feedback';
import { sfx } from './sound';
import Spotlight from './Spotlight';
import { TitleScreen, SettingsModal, CreditsModal, LoadingScreen, useSettings } from './Menus';
import { GAME_NAME, GAME_ICON } from '../brand';
import Dice from '../Dice';
import Mines from '../Mines';
import Plinko from '../Plinko';
import Crash from '../Crash';
import Roulette from '../Roulette';
import Blackjack from '../Blackjack';
import Chicken from '../Chicken';
import Pump from '../Pump';

const TOOL_COUNT = (s) => TOOLS.filter(t => t.loc <= s.location && !s.tools.includes(t.id) && s.money >= t.cost).length;
const HELPER_COUNT = (s) => HELPERS.filter(h => h.loc <= s.location && s.money >= helperCostN(h, s.helpers[h.id] || 0, 1)).length;
// Am Handy: Spielfläche oben, Bedienung unten im Daumenbereich
const REORDER = ['dice', 'mines', 'plinko', 'crash', 'pump'];
const GAME_COMPONENTS = { dice: Dice, mines: Mines, plinko: Plinko, crash: Crash, roulette: Roulette, blackjack: Blackjack, chicken: Chicken, pump: Pump };
// Pump hatte eigene, kaufbare Schwierigkeitsstufen – im Mogul-Modus sind alle frei
const PUMP_USER = { unlocked_diffs: JSON.stringify(['easy', 'medium', 'hard', 'expert']) };

let toastId = 0;

const rewardText = (q) => [q.reward ? `+${fmtMoney(q.reward)}` : '', q.rewardJ ? `+${q.rewardJ} 🟣` : ''].filter(Boolean).join(' ');

// Tutorial-Aufgabe oben im Spiel
function QuestTracker({ state, onClaim }) {
  const i = state.quest || 0;
  if (i >= QUESTS.length) return null;
  const q = QUESTS[i];
  const p = Math.min(1, q.progress(state));
  const done = questDone(state);
  return (
    <div className="mg-quest">
      <div className="ic">{q.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="h">AUFGABE {i + 1}/{QUESTS.length}</div>
        <div className="t">{q.title}</div>
        <div className="h hint">{q.hint}</div>
        <div className="bar"><div style={{ width: `${p * 100}%` }} /></div>
      </div>
      {done
        ? <button data-tut="claim" className="mg-btn green mg-hl" onClick={onClaim} style={{ whiteSpace: 'nowrap' }}>🎁 {rewardText(q)}</button>
        : <div className="rw">🎁 {rewardText(q)}</div>}
    </div>
  );
}

// Geldanzeige rollt weich zum echten Wert und hüpft bei Gewinnen
function MoneyCounter({ value }) {
  // Zählt weich hoch, rendert aber nur, wenn sich die angezeigte Zahl wirklich ändert
  const [text, setText] = useState(() => fmtMoney(value));
  const [bump, setBump] = useState(0);
  const shownRef = useRef(value);
  const lastRef = useRef(value);
  useEffect(() => {
    if (value > lastRef.current * 1.002 + 0.009) setBump(b => b + 1);
    lastRef.current = value;
    let raf;
    const step = () => {
      const cur = shownRef.current;
      const diff = value - cur;
      const next = Math.abs(diff) < Math.max(0.005, Math.abs(value) * 1e-6) ? value : cur + diff * 0.25;
      shownRef.current = next;
      const t = fmtMoney(next);
      setText(old => (old === t ? old : t));
      if (next !== value) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span key={bump} className={`amount${bump ? ' bump' : ''}`}>{text}</span>;
}

function Confetti({ burst }) {
  const [pieces, setPieces] = useState([]);
  useEffect(() => {
    if (!burst) return undefined;
    const colors = ['#ffc83d', '#ff3ea5', '#3ee6ff', '#3dff8b', '#b18cff'];
    setPieces(Array.from({ length: 80 }, (_, i) => ({
      id: `${burst}-${i}`, left: Math.random() * 100, delay: Math.random() * 0.6, dur: 2.2 + Math.random() * 1.8,
      color: colors[i % colors.length], rot: Math.random() * 360,
    })));
    const t = setTimeout(() => setPieces([]), 4800);
    return () => clearTimeout(t);
  }, [burst]);
  return pieces.map(p => (
    <div key={p.id} className="mg-confetti" style={{ left: `${p.left}%`, background: p.color, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`, transform: `rotate(${p.rot}deg)` }} />
  ));
}

function BigWin({ win, onClose }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf;
    const step = (t) => {
      const p = Math.min(1, (t - start) / 1600);
      setShown(win.amount * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const close = setTimeout(onClose, 4200);
    return () => { cancelAnimationFrame(raf); clearTimeout(close); };
  }, [win, onClose]);
  const tier = win.jackpot ? 'epic' : win.multiplier >= 200 ? 'epic' : win.multiplier >= 50 ? 'mega' : 'big';
  const title = win.jackpot ? '💰 JACKPOT! 💰' : { big: 'BIG WIN!', mega: 'MEGA WIN!', epic: 'EPIC WIN!' }[tier];
  const rain = useRef(Array.from({ length: 36 }, (_, i) => ({ id: i, left: Math.random() * 100, dur: 1.6 + Math.random() * 2, delay: Math.random() * 1.5, e: ['🪙', '💰', '💵', '💎'][i % 4] }))).current;
  return (
    <div className={`mg-bigwin ${tier}`} onClick={onClose}>
      {rain.map(r => <div key={r.id} className="mg-rain" style={{ left: `${r.left}%`, animationDuration: `${r.dur}s`, animationDelay: `${r.delay}s` }}>{r.e}</div>)}
      <div className="title">{title}</div>
      <div className="amt">+{fmtMoney(shown)}</div>
      <div className="mult">{win.jackpot ? `Progressiver Jackpot geknackt · ${GAME_INFO[win.game]?.name || 'Casino'}` : `×${fmt(win.multiplier, 1)} · ${GAME_INFO[win.game]?.name || 'Casino'}`}</div>
    </div>
  );
}

// Handy-Layout (schmaler Bildschirm)
function useIsMobile() {
  const q = '(max-width: 760px)';
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const fn = () => setM(mq.matches);
    mq.addEventListener ? mq.addEventListener('change', fn) : mq.addListener(fn);
    return () => (mq.removeEventListener ? mq.removeEventListener('change', fn) : mq.removeListener(fn));
  }, []);
  return m;
}

// Wohin zeigt das Spotlight? Erst das eigentliche Ziel, sonst der Weg dorthin.
const resolveHl = (h, state) => (h === 'game-slot' ? `game-slots-${LOCATIONS[state.location].id}` : h);

function tutorialTargets(state, quest, done, activeGame, isMobile) {
  if (done) return [{ id: 'claim', tip: 'Geschafft! Hol dir deine Belohnung 🎁' }];
  const h = resolveHl(quest.hl, state);
  // Kauf-Aufgabe, aber noch zu wenig Geld: erst sammeln schicken
  const price = h.startsWith('tool-') ? (TOOLS.find(t => `tool-${t.id}` === h) || {}).cost
    : h.startsWith('helper-') ? (() => { const x = HELPERS.find(y => `helper-${y.id}` === h); return x ? helperCostN(x, state.helpers[x.id] || 0, 1) : 0; })() : 0;
  if (price && state.money < price) {
    return [{ id: 'floor', tip: `Sammle noch ${fmtMoney(price - state.money)} – tippe auf die Münzen!` }, { id: 'nav-search', tip: 'Zurück zum Sammeln 🪙' }];
  }
  if (h.startsWith('game-') && activeGame === h.slice(5)) return [{ id: 'spin', tip: 'Tippe auf SPIN!' }];
  const chain = [{ id: h, tip: quest.tip }];
  if (h.startsWith('tool-')) chain.push({ id: 'shoptab-tools', tip: 'Wechsle zu den Werkzeugen 🛠️' });
  if (h.startsWith('helper-')) chain.push({ id: 'shoptab-helpers', tip: 'Wechsle zu den Helfern 👥' });
  if (h.startsWith('tool-') || h.startsWith('helper-')) {
    chain.push({ id: 'nav-shop', tip: 'Öffne den Shop 🛒' });
    if (!isMobile) chain.push({ id: 'nav-search', tip: 'Zurück zum Sammeln – dort ist der Shop' });
  }
  if (h === 'floor' || h === 'goal') chain.push({ id: 'nav-search', tip: 'Zurück zum Sammeln 🪙' });
  if (h === 'bonus') chain.push({ id: `game-slots-${LOCATIONS[state.location].id}`, tip: 'Öffne den Automaten – dort warten deine Gratis-Spins' });
  if (h.startsWith('jitem-')) {
    chain.push({ id: 'jtab-shop', tip: 'Wechsle zum Jeton-Shop 🛍️' });
    chain.push({ id: 'nav-jetons', tip: 'Hier sind deine Jetons: Shop und Skilltree 🟣' });
    return chain;
  }
  if (h.startsWith('game-') || h === 'wheel' || h === 'bonus') {
    chain.push({ id: 'game-back', tip: 'Zurück zur Casino-Lobby' });
    chain.push({ id: 'nav-casino', tip: 'Ab ins Casino! 🎰' });
  }
  return chain;
}

export default function GameApp({ user, onLogout, onAdmin }) {
  const [toasts, setToasts] = useState([]);
  const [bigWin, setBigWin] = useState(null);
  const [confetti, setConfetti] = useState(0);
  const settings = useSettings();
  const isMobile = useIsMobile();
  const [menu, setMenu] = useState('title'); // title | null
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [moreTab, setMoreTab] = useState('collection');
  const [dismissedAnn, setDismissedAnn] = useState(() => { try { return +localStorage.getItem('mogul_ann') || 0; } catch { return 0; } });
  const extrasRef = useRef(false);

  const toast = useCallback((t) => {
    const id = ++toastId;
    setToasts(list => [...list.slice(-3), { id, ...t }]);
    setTimeout(() => setToasts(list => list.filter(x => x.id !== id)), 4000);
  }, []);

  const game = useGame(user, {
    onAchievement: (a) => { if (!extrasRef.current) return; sfx.achievement(); toast({ kind: 'ach', icon: a.icon, title: 'ERFOLG FREIGESCHALTET', text: `${a.name} · +2% auf alles` }); },
    onBigWin: (w) => { sfx.bigWin(); setBigWin(w); },
    onJackpotNews: (w) => { sfx.win(); toast({ kind: 'ach', icon: '🎉', title: 'JACKPOT GEKNACKT', text: `${w.username} hat ${fmtMoney(w.amount)} bei ${GAME_INFO[w.game]?.name || 'einem Spiel'} geknackt!` }); },
    onJackpotCooldown: (min) => toast({ icon: '⏳', title: 'JACKPOT GESPERRT', text: `Du hast vor Kurzem schon geknackt. Wieder möglich in ${min} min.` }),
    onAdmin: (a) => { const t = ADMIN_ACTION_TEXT(a); if (t) { sfx.achievement(); toast({ kind: 'new', icon: a.type === 'message' ? '📢' : '🛠️', title: 'NACHRICHT VOM ADMIN', text: t }); } },
    onTreeEvent: (ev) => { sfx.win(); toast({ icon: ev.icon, title: 'SKILLTREE', text: ev.text }); },
    onInsurance: (amt) => { sfx.win(); toast({ icon: '🛡️', title: 'VERSICHERUNG', text: `Verlust von ${fmtMoney(amt)} erstattet. Wieder bereit in 1 Stunde.` }); },
    onJetonJackpot: (pot) => { sfx.bigWin(); setConfetti(c => c + 1); toast({ kind: 'ach', icon: '💎', title: 'JETON-JACKPOT!', text: `+${fmtJetons(pot)} am High-Roller-Automaten` }); },
    onJackpot: (w) => { sfx.bigWin(); setTimeout(() => sfx.bigWin(), 900); setConfetti(c => c + 1); setBigWin({ ...w, jackpot: true, multiplier: 0 }); },
  });
  const [tab, setTab] = useState('search');
  const [activeGame, setActiveGame] = useState(null);
  const [jetTab, setJetTab] = useState('tree');
  const [charmModal, setCharmModal] = useState(null);
  const [moveModal, setMoveModal] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const { state, derived } = game;

  const buyHelper = useCallback((id, n) => {
    const before = state.helpers[id] || 0;
    if (game.buyHelper(id, n)) {
      sfx.buy();
      const m = nextMilestone(before);
      if (m && before + n >= m) {
        const h = HELPERS.find(x => x.id === id);
        sfx.levelUp();
        toast({ icon: h.icon, title: 'MEILENSTEIN', text: `${m}× ${h.name} – Tempo verdoppelt!` });
      }
    } else sfx.nope();
  }, [game, state, toast]);

  const buyJeton = useCallback((id) => { if (game.buyJeton(id)) { sfx.buy(); if (id === 'highroller') setConfetti(c => c + 1); } else sfx.nope(); }, [game]);
  const buyFinger = useCallback(() => { if (game.buyFinger()) { sfx.levelUp(); setConfetti(c => c + 1); } else sfx.nope(); }, [game]);
  const buyTool = useCallback((id) => { if (game.buyTool(id)) sfx.buy(); else sfx.nope(); }, [game]);
  const buyVip = useCallback((n = 1) => { if (game.buyVip(n)) { sfx.levelUp(); setConfetti(c => c + 1); } else sfx.nope(); }, [game]);

  const move = useCallback(() => {
    const target = LOCATIONS[state.location + 1];
    if (game.moveLocation()) {
      sfx.move(); setConfetti(c => c + 1); setMoveModal(target);
      if (state.location === 0 && !state.tutorialSkipped) setTimeout(() => toast({ kind: 'new', icon: '🟣', title: 'NEU FREIGESCHALTET', text: 'Jetons – die Casino-Währung' }), 900);
    }
  }, [game, state, toast]);

  const onAlbum = useCallback((a) => {
    if (a.setDone) { sfx.bigWin(); setConfetti(c => c + 1); toast({ kind: 'ach', icon: '📖', title: 'ALBUM-SET KOMPLETT!', text: `Dauerhaft +10 % Münzwert` }); }
    else if (a.dup) toast({ icon: a.icon, title: 'DOPPELTES ALBUM-STÜCK', text: a.jetons ? `${a.name} → +${a.jetons} Jetons 🟣` : a.name });
    else { sfx.charm(); toast({ kind: 'new', icon: a.icon, title: 'NEU IM SAMMELALBUM', text: a.name }); }
  }, [toast]);
  const onCharm = useCallback((c) => { setConfetti(x => x + 1); setCharmModal(c); }, []);
  const claimQuest = useCallback(() => {
    const q = QUESTS[state.quest || 0];
    const i = state.quest || 0;
    if (game.claimQuest()) {
      sfx.achievement(); setConfetti(x => x + 1);
      toast({ kind: 'ach', icon: q.icon, title: 'AUFGABE ERLEDIGT', text: `${q.title} · ${rewardText(q)}` });
      unlocksAfter(i).filter(k => UNLOCK_INFO[k] && !isUnlocked(state, k)).forEach((k, n) => setTimeout(() => {
        sfx.levelUp();
        toast({ kind: 'new', icon: UNLOCK_INFO[k].icon, title: 'NEU FREIGESCHALTET', text: UNLOCK_INFO[k].name });
      }, 500 + n * 400));
      if (i + 1 >= QUESTS.length) setTimeout(() => toast({ kind: 'ach', icon: '🎓', title: 'TUTORIAL GESCHAFFT', text: 'Ab jetzt bist du auf dich allein gestellt – viel Glück!' }), 600);
    }
  }, [game, state, toast]);
  const closeBigWin = useCallback(() => setBigWin(null), []);
  // Geheimer Erfolg: 10× schnell aufs Logo tippen
  const logoRef = useRef([]);
  const logoTap = useCallback(() => {
    const now = Date.now();
    logoRef.current = [...logoRef.current.filter(t => now - t < 4000), now];
    if (logoRef.current.length >= 10) { logoRef.current = []; game.markSecret('logo'); }
  }, [game]);

  if (!state) return <LoadingScreen />;

  const nextLoc = LOCATIONS[state.location + 1];
  const canMove = nextLoc && state.money >= nextLoc.cost;
  const un = {
    tools: isUnlocked(state, 'tools'), helpers: isUnlocked(state, 'helpers'), casino: isUnlocked(state, 'casino') && derived.games.length > 0,
    wheel: isUnlocked(state, 'wheel'), locations: isUnlocked(state, 'locations'), extras: isUnlocked(state, 'extras'), jetons: jetonsOn(state),
  };
  extrasRef.current = un.extras;
  // Was soll aufleuchten? (nur solange die aktuelle Aufgabe nicht erledigt ist)
  const quest = (state.quest || 0) < QUESTS.length ? QUESTS[state.quest || 0] : null;
  const qDone = quest ? questDone(state) : false;
  const hl = quest && !qDone ? resolveHl(quest.hl, state) : '';
  const casinoHl = hl === 'wheel' || hl.startsWith('game-') || hl === 'bonus';
  const jetonHl = hl.startsWith('jitem-');
  const treeCan = un.jetons ? TREE.filter(n => !treeOwned(state, n.id) && treeCanReach(state, n) && (state.jetons || 0) >= n.cost).length : 0;
  const shopHl = hl.startsWith('tool-') || hl.startsWith('helper-');
  const wheelReady = un.wheel && (state.wheelReadyAt || 0) <= Date.now();
  const canBuyCount = un.tools ? (TOOL_COUNT(state) + (un.helpers ? HELPER_COUNT(state) : 0)) : 0;
  const curTab = (tab === 'shop' && !isMobile) ? 'search' : tab;

  const TABS = [
    { id: 'search', label: '🪙 Sammeln', short: 'Sammeln', icon: '🪙', show: true, hl: (hl === 'floor' || hl === 'goal' || (shopHl && !isMobile)) },
    { id: 'shop', label: '🛒 Shop', short: 'Shop', icon: '🛒', show: isMobile && un.tools, badge: canBuyCount > 0 ? canBuyCount : null, hl: shopHl },
    { id: 'casino', label: '🎰 Casino', short: 'Casino', icon: '🎰', show: un.casino, badge: wheelReady ? '🎡' : null, hl: casinoHl },
    { id: 'jetons', label: '🟣 Jetons', short: 'Jetons', icon: '🟣', show: un.jetons, badge: treeCan > 0 ? treeCan : null, hl: jetonHl },
    { id: 'locations', label: '🗺️ Orte', short: 'Orte', icon: '🗺️', show: un.locations, badge: canMove ? '!' : null },
    ...(isMobile
      ? [{ id: 'more', label: '☰ Mehr', short: 'Mehr', icon: '☰', show: un.extras }]
      : [
        { id: 'collection', label: '🏆 Erfolge', show: un.extras },
        { id: 'leaderboard', label: '👑 Rangliste', show: un.extras },
        { id: 'stats', label: '📊 Statistik', show: un.extras },
      ]),
  ].filter(t => t.show);
  const goTab = (id) => { sfx.click(); setTab(id); if (id !== 'casino') setActiveGame(null); window.scrollTo({ top: 0 }); };

  const renderTab = () => {
    switch (curTab) {
      case 'locations': return <LocationsView state={state} onMove={move} />;
      case 'jetons': {
        const jt = jetonHl ? 'shop' : jetTab;
        return (
          <div>
            <div className="mg-subtabs">
              {[['tree', '🌳 Skilltree'], ['shop', '🛍️ Shop & Designs']].map(([id, l]) => (
                <button key={id} data-tut={`jtab-${id}`} className={`${jt === id ? 'active' : ''}${id === 'shop' && jetonHl && jt !== 'shop' ? ' mg-hl' : ''}`} onClick={() => { sfx.click(); setJetTab(id); }}>{l}</button>
              ))}
            </div>
            {jt === 'tree'
              ? <TreeView state={state} onBuy={(id) => game.buyTreeNode(id)} />
              : <JetonShop state={state} onBuy={buyJeton} onBuySkin={(k, id) => { if (game.buySkin(k, id)) sfx.buy(); else sfx.nope(); }} />}
          </div>
        );
      }
      case 'shop': return <Shop state={state} derived={derived} onBuyHelper={buyHelper} onBuyTool={buyTool} onBuyFinger={buyFinger} hl={hl} showHelpers={un.helpers} />;
      case 'more': return (
        <div>
          <div className="mg-subtabs">
            {[['collection', '🏆 Erfolge'], ['leaderboard', '👑 Rangliste'], ['stats', '📊 Statistik']].map(([id, l]) => (
              <button key={id} className={moreTab === id ? 'active' : ''} onClick={() => { sfx.click(); setMoreTab(id); }}>{l}</button>
            ))}
          </div>
          {moreTab === 'collection' && <CollectionView state={state} user={user} onProfile={game.setProfile} />}
          {moreTab === 'leaderboard' && <LeaderboardView user={user} />}
          {moreTab === 'stats' && <StatsView state={state} onReset={() => { game.resetGame(); setTab('search'); }} />}
        </div>
      );
      case 'casino': {
        if (activeGame === 'highroller' && (state.jetonShop || {}).highroller) {
          return (
            <div>
              <div className="mg-gamebar">
                <button className="mg-btn-ghost" data-tut="game-back" onClick={() => { sfx.click(); setActiveGame(null); }}>{isMobile ? '✕' : '← Lobby'}</button>
                <span className="disp">💎 High Roller</span>
                <span className="mg-jpill" style={{ marginLeft: 'auto' }}>{fmtJetons(state.jetons || 0)}</span>
              </div>
              <Slots key="highroller" balance={state.jetons || 0} setBalance={game.setJetons} addResult={game.addJetonResult}
                maxBet={HIGHROLLER_BETS[HIGHROLLER_BETS.length - 1]} betPresets={HIGHROLLER_BETS} winBonus={0} jackpot={state.jetonPot || 100}
                themeId="highroller" gameId="highroller" turbo={derived.turbo} money={fmtJetons} />
            </div>
          );
        }
        if (activeGame && derived.games.includes(activeGame)) {
          const isSlot = activeGame.startsWith('slots-');
          const G = isSlot ? Slots : GAME_COMPONENTS[activeGame];
          return (
            <div>
              <div className="mg-gamebar">
                <button className="mg-btn-ghost" data-tut="game-back" onClick={() => { sfx.click(); setActiveGame(null); }}>{isMobile ? '✕' : '← Lobby'}</button>
                <span className="disp">{GAME_INFO[activeGame].icon} {GAME_INFO[activeGame].name}</span>
              </div>
              {un.wheel && <div className="mg-gamevip" style={{ marginBottom: 10 }}><VipCard state={state} derived={derived} onBuy={buyVip} compact /></div>}
              <div className={isSlot ? '' : `mg-game-wrap game-${activeGame}${REORDER.includes(activeGame) ? ' reorder' : ''}`}>
                <G balance={state.money} setBalance={game.setBalance} addResult={game.addResult}
                  maxBet={derived.maxBet} winBonus={derived.winBonus} prestigeMult={1} globalMult={1} autoSpeed={500}
                  user={PUMP_USER} setUser={() => {}} jackpot={game.jackpot.pool}
                  key={activeGame} themeId={isSlot ? activeGame.slice(6) : undefined} gameId={activeGame}
                  freeSpins={derived.freeSpins} freeMult={derived.freeMult} turbo={derived.turbo} bonusSpins={un.jetons ? state.bonusSpins || 0 : 0} onUseBonus={game.useBonusSpins} />
              </div>
            </div>
          );
        }
        return <CasinoView state={state} derived={derived} onPick={(g) => { sfx.click(); setActiveGame(g); window.scrollTo({ top: 0 }); }} onSpin={game.spinWheel} onBuyVip={buyVip} onOpenJetons={un.jetons ? () => goTab('jetons') : null} hl={hl} jackpot={game.jackpot} showExtras={un.wheel} me={user.username} />;
      }
      case 'collection': return <CollectionView state={state} user={user} onProfile={game.setProfile} />;
      case 'leaderboard': return <LeaderboardView user={user} />;
      case 'stats': return <StatsView state={state} onReset={() => { game.resetGame(); setTab('search'); }} />;
      default: {
        const search = <SearchView state={state} derived={derived} onPickup={game.pickup} onPickCharm={game.pickCharm} onOpenSack={game.openSack} onMove={move} onCharm={onCharm} hl={hl}
          showGoal={un.locations} showExtras={un.extras} allowSack={un.tools} onPickJeton={game.pickJeton} showJetons={un.jetons} onAlbum={onAlbum} fingerEvery={settings.fieldHelpers ? fingerEvery(state) : 0} fieldHelpers={settings.fieldHelpers} onMiss={game.addMiss} onSecret={(k) => game.markSecret(k)}
          onChest={game.openChest} onClover={game.addBonusSpins} helperIcon={(HELPERS.filter(h => (state.helpers[h.id] || 0) > 0).pop() || { icon: '🧹' }).icon} />;
        if (isMobile || !un.tools) return search;
        return (
          <div className="mg-split">
            {search}
            <Shop state={state} derived={derived} onBuyHelper={buyHelper} onBuyTool={buyTool} onBuyFinger={buyFinger} hl={hl} showHelpers={un.helpers} />
          </div>
        );
      }
    }
  };

  return (
    <div className={`mg${isMobile ? ' is-mobile' : ''}${TABS.length > 1 ? ' has-nav' : ''}${settings.lowFx ? ' lowfx' : ''}`}>
      <header className="mg-header">
        <div className="mg-logo" onClick={logoTap}><span className="hat">{GAME_ICON}</span><span className="word">{GAME_NAME}</span></div>
        <div className="mg-money">
          <div className="coin3d">€</div>
          <div style={{ lineHeight: 1.1 }}>
            <MoneyCounter value={state.money} />
            {un.jetons && <span className="mg-jpill head" title="Jetons – Casino-Währung">{fmtJetons(state.jetons || 0)}</span>}
            <div className="rate">
              {derived.incomePerSec > 0 ? `+${fmtMoney(derived.incomePerSec)}/s` : 'Sammle Münzen!'}
              {derived.boost && <span style={{ color: 'var(--purple)' }}> · ⚡2×</span>}
            </div>
          </div>
        </div>
        <div className="mg-user">
          <span className="name">👤 {user.username}</span>
          {onAdmin && <button className="mg-icon-btn mg-adminbtn" title="Zur Admin-Zentrale" onClick={() => { game.saveNow(); onAdmin(); }}>🛠️</button>}
          <button className="mg-icon-btn" title="Feedback geben" onClick={() => setFeedbackOpen(true)}>💬</button>
          <button className="mg-icon-btn" title="Einstellungen" onClick={() => { sfx.click(); setSettingsOpen(true); }}>⚙️</button>
        </div>
      </header>

      {TABS.length > 1 && (
        <nav className={isMobile ? 'mg-bottomnav' : 'mg-tabs'}>
          {TABS.map(t => (
            <button key={t.id} data-tut={`nav-${t.id}`} className={`${isMobile ? 'mg-bn' : 'mg-tab'} ${curTab === t.id ? 'active' : ''}${t.hl && curTab !== t.id ? ' mg-hl' : ''}`}
              onClick={() => goTab(t.id)}>
              {isMobile ? <><span className="i">{t.icon}</span><span className="l">{t.short}</span></> : t.label}
              {t.badge && <span className="badge">{t.badge}</span>}
            </button>
          ))}
        </nav>
      )}

      {game.announcement && game.announcement.text && dismissedAnn !== game.announcement.id && (
        <div className="mg-announce">
          <span>📢</span><div>{game.announcement.text}</div>
          <button onClick={() => { setDismissedAnn(game.announcement.id); try { localStorage.setItem('mogul_ann', String(game.announcement.id)); } catch {} }} aria-label="Schließen">✕</button>
        </div>
      )}

      <main className="mg-main">
        <QuestTracker state={state} onClaim={claimQuest} />
        {renderTab()}
      </main>

      {/* Willkommen zurück */}
      {game.welcome && !menu && (
        <div className="mg-modal-bg" onClick={game.dismissWelcome}>
          <div className="mg-modal" onClick={e => e.stopPropagation()}>
            <div className="rays" />
            <div className="big">💤</div>
            <h2>Willkommen zurück!</h2>
            <p>Während du {fmtTime(game.welcome.away || game.welcome.seconds)} weg warst, haben deine Helfer gesammelt:</p>
            <div className="disp" style={{ fontSize: 38, color: 'var(--green)', marginBottom: 20 }}>+{fmtMoney(game.welcome.earned)}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: -12, marginBottom: 18 }}>
              Offline arbeiten deine Helfer mit 20 % Tempo{(game.welcome.away || 0) > OFFLINE_CAP_SEC ? ' · nur die ersten 8 Stunden zählen' : ' · max. 8 Stunden'}
            </div>
            <button className="mg-btn green" onClick={() => { sfx.gold(); game.dismissWelcome(); }}>Einsammeln</button>
          </div>
        </div>
      )}

      {/* Glücksbringer gefangen */}
      {charmModal && (
        <div className="mg-modal-bg" onClick={() => setCharmModal(null)}>
          <div className="mg-modal" onClick={e => e.stopPropagation()} style={{ borderColor: 'var(--gold)' }}>
            <div className="rays" />
            <div className="disp" style={{ color: 'var(--gold)', letterSpacing: 2, fontSize: 14 }}>✨ SELTENER FUND ✨</div>
            <div className="big" style={{ marginTop: 10 }}>{charmModal.icon}</div>
            <h2>{charmModal.name}</h2>
            <p>Chance 1 : {charmModal.odds.toLocaleString('de-DE')} pro Münze<br /><b style={{ color: 'var(--gold)' }}>{charmModal.desc}</b> – dauerhaft!</p>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>Du hast jetzt {state.charms[charmModal.id]} / {charmModal.max}</div>
            <button className="mg-btn" onClick={() => setCharmModal(null)}>Nice!</button>
          </div>
        </div>
      )}

      {/* Umgezogen */}
      {moveModal && (
        <div className="mg-modal-bg" onClick={() => setMoveModal(null)}>
          <div className="mg-modal" onClick={e => e.stopPropagation()}>
            <div className="rays" />
            <div className="disp" style={{ color: 'var(--green)', letterSpacing: 2, fontSize: 14 }}>NEUER ORT FREIGESCHALTET</div>
            <div className="big" style={{ marginTop: 10 }}>{moveModal.icon}</div>
            <h2>{moveModal.name}</h2>
            <p>{moveModal.desc}</p>
            {state.location > 0 && SLOT_THEMES[moveModal.id] && <p style={{ fontSize: 13, marginTop: -8 }}>Dein alter Automat bleibt zurück – im neuen Casino ist dafür kein Platz.</p>}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
              <span className="mg-lvl" style={{ color: 'var(--gold)' }}>🪙 {coinRange(moveModal)}</span>
              {SLOT_THEMES[moveModal.id] && <span className="mg-lvl" style={{ color: 'var(--pink)' }}>🎰 Neuer Automat: {SLOT_THEMES[moveModal.id].name}</span>}
            </div>
            <button className="mg-btn green" onClick={() => setMoveModal(null)}>Los geht's!</button>
          </div>
        </div>
      )}

      {!menu && <TestKit state={state} game={game} />}
      {quest && (quest.guide || qDone) && !state.tutorialSkipped && !menu && !settingsOpen && !feedbackOpen && !charmModal && !moveModal && !game.welcome && !bigWin && (
        <Spotlight targets={tutorialTargets(state, quest, qDone, curTab === 'casino' ? activeGame : null, isMobile)} blocking
          onSkip={(state.quest || 0) < 2 ? () => game.skipTutorial() : null} onSettings={() => setSettingsOpen(true)} onAdmin={onAdmin ? () => { game.saveNow(); onAdmin(); } : null} />
      )}
      {bigWin && <BigWin win={bigWin} onClose={closeBigWin} />}
      {settingsOpen && (
        <SettingsModal user={user} onClose={() => setSettingsOpen(false)}
          onFeedback={() => { setSettingsOpen(false); setFeedbackOpen(true); }}
          onMenu={() => { setSettingsOpen(false); game.saveNow(); setMenu('title'); }}
          onLogout={() => { game.saveNow(); onLogout(); }}
          onReset={() => { game.resetGame(); setTab('search'); setActiveGame(null); }} />
      )}
      {menu === 'title' && (
        <TitleScreen user={user} onPlay={() => setMenu(null)} onSettings={() => setSettingsOpen(true)} onCredits={() => { setCreditsOpen(true); game.markSecret('credits', ((state.secrets || {}).credits || 0) + 1); }}
          onLogout={() => { game.saveNow(); onLogout(); }} />
      )}
      {creditsOpen && <CreditsModal onClose={() => setCreditsOpen(false)} />}
      {feedbackOpen && <Feedback state={state} onClose={() => setFeedbackOpen(false)} onSent={() => game.markSecret('feedback')} />}
      <Confetti burst={confetti} />

      <div className="mg-toasts">
        {toasts.map(t => (
          <div key={t.id} className={`mg-toast ${t.kind || ''}`}>
            <div className="ic">{t.icon}</div>
            <div>{t.title && <div className="t">{t.title}</div>}{t.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
