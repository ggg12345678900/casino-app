import React, { useState, useCallback, useEffect, useRef } from 'react';
import './game.css';
import useGame from './useGame';
import { LOCATIONS, fmtMoney, fmtTime, fmt, HELPERS, nextMilestone, OFFLINE_CAP_SEC, QUESTS, questDone } from './economy';
import SearchView from './SearchView';
import Shop from './Shop';
import { LocationsView, CasinoView, CollectionView, LeaderboardView, StatsView, GAME_INFO, coinRange, VipCard } from './Views';
import Slots from './Slots';
import Feedback from './Feedback';
import { sfx, isMuted, setMuted } from './sound';
import Dice from '../Dice';
import Mines from '../Mines';
import Plinko from '../Plinko';
import Crash from '../Crash';
import Roulette from '../Roulette';
import Blackjack from '../Blackjack';
import Chicken from '../Chicken';
import Pump from '../Pump';

const GAME_COMPONENTS = { dice: Dice, mines: Mines, plinko: Plinko, crash: Crash, roulette: Roulette, blackjack: Blackjack, chicken: Chicken, pump: Pump };
// Pump hatte eigene, kaufbare Schwierigkeitsstufen – im Mogul-Modus sind alle frei
const PUMP_USER = { unlocked_diffs: JSON.stringify(['easy', 'medium', 'hard', 'expert']) };

let toastId = 0;

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
        <div className="h">{q.hint}</div>
        <div className="bar"><div style={{ width: `${p * 100}%` }} /></div>
      </div>
      {done
        ? <button className="mg-btn green mg-hl" onClick={onClaim} style={{ whiteSpace: 'nowrap' }}>🎁 +{fmtMoney(q.reward)} abholen</button>
        : <div className="rw">🎁 +{fmtMoney(q.reward)}</div>}
    </div>
  );
}

// Geldanzeige rollt weich zum echten Wert und hüpft bei Gewinnen
function MoneyCounter({ value }) {
  const [shown, setShown] = useState(value);
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
      setShown(next);
      if (next !== value) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span key={bump} className={`amount${bump ? ' bump' : ''}`}>{fmtMoney(shown)}</span>;
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

export default function GameApp({ user, onLogout }) {
  const [toasts, setToasts] = useState([]);
  const [bigWin, setBigWin] = useState(null);
  const [confetti, setConfetti] = useState(0);
  const [muted, setMutedState] = useState(isMuted());

  const toast = useCallback((t) => {
    const id = ++toastId;
    setToasts(list => [...list.slice(-3), { id, ...t }]);
    setTimeout(() => setToasts(list => list.filter(x => x.id !== id)), 4000);
  }, []);

  const game = useGame(user, {
    onAchievement: (a) => { sfx.achievement(); toast({ kind: 'ach', icon: a.icon, title: 'ERFOLG FREIGESCHALTET', text: `${a.name} · +2% auf alles` }); },
    onBigWin: (w) => { sfx.bigWin(); setBigWin(w); },
    onJackpotNews: (w) => { sfx.win(); toast({ kind: 'ach', icon: '🎉', title: 'JACKPOT GEKNACKT', text: `${w.username} hat ${fmtMoney(w.amount)} bei ${GAME_INFO[w.game]?.name || 'einem Spiel'} geknackt!` }); },
    onJackpotCooldown: (min) => toast({ icon: '⏳', title: 'JACKPOT GESPERRT', text: `Du hast vor Kurzem schon geknackt. Wieder möglich in ${min} min.` }),
    onJackpot: (w) => { sfx.bigWin(); setTimeout(() => sfx.bigWin(), 900); setConfetti(c => c + 1); setBigWin({ ...w, jackpot: true, multiplier: 0 }); },
  });
  const [tab, setTab] = useState('search');
  const [activeGame, setActiveGame] = useState(null);
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

  const buyTool = useCallback((id) => { if (game.buyTool(id)) sfx.buy(); else sfx.nope(); }, [game]);
  const buyVip = useCallback((n = 1) => { if (game.buyVip(n)) { sfx.levelUp(); setConfetti(c => c + 1); } else sfx.nope(); }, [game]);

  const move = useCallback(() => {
    const target = LOCATIONS[state.location + 1];
    if (game.moveLocation()) { sfx.move(); setConfetti(c => c + 1); setMoveModal(target); }
  }, [game, state]);

  const onCharm = useCallback((c) => { setConfetti(x => x + 1); setCharmModal(c); }, []);
  const claimQuest = useCallback(() => {
    const q = QUESTS[state.quest || 0];
    if (game.claimQuest()) {
      sfx.achievement(); setConfetti(x => x + 1);
      toast({ kind: 'ach', icon: q.icon, title: 'AUFGABE ERLEDIGT', text: `${q.title} · +${fmtMoney(q.reward)}` });
      if ((state.quest || 0) + 1 >= QUESTS.length) setTimeout(() => toast({ kind: 'ach', icon: '🎓', title: 'TUTORIAL GESCHAFFT', text: 'Jetzt bist du bereit für den Aufstieg zum Mogul!' }), 600);
    }
  }, [game, state, toast]);
  const closeBigWin = useCallback(() => setBigWin(null), []);

  if (!state) {
    return (
      <div className="mg" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 56 }}>🎩</div>
        <div className="disp" style={{ color: 'var(--muted)', marginTop: 8, fontSize: 20 }}>Lade Spielstand…</div>
      </div>
    );
  }

  const nextLoc = LOCATIONS[state.location + 1];
  const canMove = nextLoc && state.money >= nextLoc.cost;
  const casinoOpen = derived.games.length > 0;
  // Was soll aufleuchten? (nur solange die aktuelle Aufgabe nicht erledigt ist)
  const quest = (state.quest || 0) < QUESTS.length ? QUESTS[state.quest || 0] : null;
  const hl = quest && !questDone(state) ? quest.hl : '';
  const casinoHl = hl === 'wheel' || hl.startsWith('game-');
  const wheelReady = casinoOpen && (state.wheelReadyAt || 0) <= Date.now();

  const TABS = [
    { id: 'search', label: '🔍 Sammeln', hl: !casinoHl && hl !== '' },
    { id: 'locations', label: '🗺️ Orte', badge: canMove ? '!' : null },
    { id: 'casino', label: casinoOpen ? '🎰 Casino' : '🔒 Casino', disabled: !casinoOpen, badge: wheelReady ? '🎡' : null, hl: casinoHl },
    { id: 'collection', label: '🏆 Erfolge' },
    { id: 'leaderboard', label: '👑 Rangliste' },
    { id: 'stats', label: '📊 Statistik' },
  ];

  const renderTab = () => {
    switch (tab) {
      case 'locations': return <LocationsView state={state} onMove={move} />;
      case 'casino': {
        if (activeGame && derived.games.includes(activeGame)) {
          const isSlot = activeGame.startsWith('slots-');
          const G = isSlot ? Slots : GAME_COMPONENTS[activeGame];
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                <button className="mg-btn-ghost" onClick={() => setActiveGame(null)}>← Zurück zur Lobby</button>
                <span className="disp" style={{ fontSize: 20 }}>{GAME_INFO[activeGame].icon} {GAME_INFO[activeGame].name}</span>
              </div>
              <div style={{ marginBottom: 10 }}><VipCard state={state} derived={derived} onBuy={buyVip} compact /></div>
              <div className={isSlot ? '' : 'mg-game-wrap'}>
                <G balance={state.money} setBalance={game.setBalance} addResult={game.addResult}
                  maxBet={derived.maxBet} winBonus={derived.winBonus} prestigeMult={1} globalMult={1} autoSpeed={500}
                  user={PUMP_USER} setUser={() => {}} jackpot={game.jackpot.pool}
                  key={activeGame} themeId={isSlot ? activeGame.slice(6) : undefined} gameId={activeGame} />
              </div>
            </div>
          );
        }
        return <CasinoView state={state} derived={derived} onPick={setActiveGame} onSpin={game.spinWheel} onBuyVip={buyVip} hl={hl} jackpot={game.jackpot} />;
      }
      case 'collection': return <CollectionView state={state} />;
      case 'leaderboard': return <LeaderboardView user={user} />;
      case 'stats': return <StatsView state={state} onReset={() => { game.resetGame(); setTab('search'); }} />;
      default:
        return (
          <div className="mg-split">
            <SearchView state={state} derived={derived} onPickup={game.pickup} onPickCharm={game.pickCharm} onOpenSack={game.openSack} onMove={move} onCharm={onCharm} hl={hl} />
            <Shop state={state} derived={derived} onBuyHelper={buyHelper} onBuyTool={buyTool} hl={hl} />
          </div>
        );
    }
  };

  return (
    <div className="mg">
      <header className="mg-header">
        <div className="mg-logo"><span className="hat">🎩</span><span className="word">Casino-Mogul</span></div>
        <div className="mg-money">
          <div className="coin3d">€</div>
          <div style={{ lineHeight: 1.1 }}>
            <MoneyCounter value={state.money} />
            <div className="rate">
              {derived.incomePerSec > 0 ? `+${fmtMoney(derived.incomePerSec)}/s` : 'Sammle Münzen!'}
              {derived.boost && <span style={{ color: 'var(--purple)' }}> · ⚡2×</span>}
            </div>
          </div>
        </div>
        <div className="mg-user">
          <span className="name">👤 {user.username}</span>
          <button className="mg-icon-btn" title="Feedback geben" onClick={() => setFeedbackOpen(true)}>💬</button>
          <button className="mg-icon-btn" title={muted ? 'Ton an' : 'Ton aus'} onClick={() => { setMuted(!muted); setMutedState(!muted); if (muted) sfx.coin(); }}>{muted ? '🔇' : '🔊'}</button>
          <button className="mg-btn-ghost" onClick={() => { game.saveNow(); onLogout(); }}>Logout</button>
        </div>
      </header>

      <nav className="mg-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`mg-tab ${tab === t.id ? 'active' : ''}${t.hl && tab !== t.id ? ' mg-hl' : ''}`} disabled={t.disabled}
            title={t.disabled ? 'Freigeschaltet in der Eckkneipe' : undefined}
            onClick={() => { setTab(t.id); if (t.id !== 'casino') setActiveGame(null); }}>
            {t.label}{t.badge && <span className="badge">{t.badge}</span>}
          </button>
        ))}
      </nav>

      <main className="mg-main">
        <QuestTracker state={state} onClaim={claimQuest} />
        {renderTab()}
      </main>

      {/* Willkommen zurück */}
      {game.welcome && (
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
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
              <span className="mg-lvl" style={{ color: 'var(--gold)' }}>🪙 {coinRange(moveModal)}</span>
            </div>
            <button className="mg-btn green" onClick={() => setMoveModal(null)}>Los geht's!</button>
          </div>
        </div>
      )}

      {bigWin && <BigWin win={bigWin} onClose={closeBigWin} />}
      {feedbackOpen && <Feedback state={state} onClose={() => setFeedbackOpen(false)} />}
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
