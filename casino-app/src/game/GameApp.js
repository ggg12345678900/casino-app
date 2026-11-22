import React, { useState, useCallback } from 'react';
import './game.css';
import useGame from './useGame';
import { LOCATIONS, fmtMoney, fmtTime, fmt, HELPERS, nextMilestone } from './economy';
import { coinRange } from './Views';
import SearchView from './SearchView';
import Shop from './Shop';
import { LocationsView, CasinoView, CollectionView, LeaderboardView, StatsView, GAME_INFO } from './Views';
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

export default function GameApp({ user, onLogout }) {
  const game = useGame(user);
  const [tab, setTab] = useState('search');
  const [activeGame, setActiveGame] = useState(null);
  const [charmModal, setCharmModal] = useState(null);
  const [moveModal, setMoveModal] = useState(null);
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((text) => {
    const id = ++toastId;
    setToasts(t => [...t.slice(-3), { id, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const { state, derived } = game;

  const buyHelper = useCallback((id, n) => {
    const before = state.helpers[id] || 0;
    if (game.buyHelper(id, n)) {
      const m = nextMilestone(before);
      if (m && before + n >= m) {
        const h = HELPERS.find(x => x.id === id);
        toast(`${h.icon} ${m}× ${h.name} – Tempo verdoppelt!`);
      }
    }
  }, [game, state, toast]);

  const move = useCallback(() => {
    const target = LOCATIONS[state.location + 1];
    if (game.moveLocation()) setMoveModal(target);
  }, [game, state]);

  if (!state) {
    return (
      <div className="mg" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 48 }}>🔍</div>
        <div style={{ color: 'var(--muted)', marginTop: 8 }}>Lade Spielstand…</div>
      </div>
    );
  }

  const nextLoc = LOCATIONS[state.location + 1];
  const canMove = nextLoc && state.money >= nextLoc.cost;
  const casinoOpen = derived.games.length > 0;

  const TABS = [
    { id: 'search', label: '🔍 Suchen' },
    { id: 'locations', label: '🗺️ Orte', badge: canMove },
    { id: 'casino', label: casinoOpen ? '🎰 Casino' : '🔒 Casino', disabled: !casinoOpen },
    { id: 'collection', label: '🍀 Sammlung' },
    { id: 'leaderboard', label: '🏆 Rangliste' },
    { id: 'stats', label: '📊 Statistik' },
  ];

  const renderTab = () => {
    switch (tab) {
      case 'locations': return <LocationsView state={state} onMove={move} />;
      case 'casino': {
        if (activeGame && derived.games.includes(activeGame)) {
          const G = GAME_COMPONENTS[activeGame];
          return (
            <div>
              <button className="mg-btn-ghost" onClick={() => setActiveGame(null)} style={{ marginBottom: 8 }}>← Zurück zum Casino</button>
              <span style={{ marginLeft: 12, color: 'var(--muted)', fontSize: 13 }}>{GAME_INFO[activeGame].icon} {GAME_INFO[activeGame].name} · Max-Einsatz {fmtMoney(derived.maxBet)}</span>
              <div className="mg-game-wrap">
                <G balance={state.money} setBalance={game.setBalance} addResult={game.addResult}
                  maxBet={derived.maxBet} winBonus={derived.winBonus} prestigeMult={1} globalMult={1} autoSpeed={500}
                  user={PUMP_USER} setUser={() => {}} />
              </div>
            </div>
          );
        }
        return <CasinoView state={state} derived={derived} onPick={setActiveGame} />;
      }
      case 'collection': return <CollectionView state={state} />;
      case 'leaderboard': return <LeaderboardView user={user} />;
      case 'stats': return <StatsView state={state} onReset={() => { game.resetGame(); setTab('search'); }} />;
      default:
        return (
          <div className="mg-split">
            <SearchView state={state} derived={derived} onPickup={game.pickup} onPickCharm={game.pickCharm} onMove={move} onCharm={setCharmModal} />
            <Shop state={state} derived={derived} onBuyHelper={buyHelper} onBuyTool={game.buyTool} />
          </div>
        );
    }
  };

  return (
    <div className="mg">
      <header className="mg-header">
        <div className="mg-logo"><span>🎩</span><span>Casino-Mogul</span></div>
        <div className="mg-money">
          <div className="amount">{fmtMoney(state.money)}</div>
          <div className="rate">{derived.incomePerSec > 0 ? `+${fmtMoney(derived.incomePerSec)}/s` : 'Noch kein Einkommen – such selbst!'}</div>
        </div>
        <div className="mg-user">
          <span className="name">👤 {user.username}</span>
          <button className="mg-btn-ghost" onClick={() => { game.saveNow(); onLogout(); }}>Logout</button>
        </div>
      </header>

      <nav className="mg-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`mg-tab ${tab === t.id ? 'active' : ''}`} disabled={t.disabled}
            title={t.disabled ? 'Freigeschaltet in der Eckkneipe' : undefined}
            onClick={() => { setTab(t.id); if (t.id !== 'casino') setActiveGame(null); }}>
            {t.label}{t.badge && <span className="badge" />}
          </button>
        ))}
      </nav>

      <main className="mg-main">{renderTab()}</main>

      {/* Willkommen zurück */}
      {game.welcome && (
        <div className="mg-modal-bg" onClick={game.dismissWelcome}>
          <div className="mg-modal" onClick={e => e.stopPropagation()}>
            <div className="big">💤</div>
            <h2>Willkommen zurück!</h2>
            <p>Während du {fmtTime(game.welcome.seconds)} weg warst, haben deine Helfer gesucht und gefunden:</p>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--green)', marginBottom: 20 }}>+{fmtMoney(game.welcome.earned)}</div>
            <button className="mg-btn green" onClick={game.dismissWelcome}>Einsammeln</button>
          </div>
        </div>
      )}

      {/* Glücksbringer gefunden */}
      {charmModal && (
        <div className="mg-modal-bg" onClick={() => setCharmModal(null)}>
          <div className="mg-modal" onClick={e => e.stopPropagation()} style={{ borderColor: '#fbbf2488', boxShadow: '0 0 60px #fbbf2433' }}>
            <div style={{ color: 'var(--gold)', fontWeight: 800, letterSpacing: 2, fontSize: 12 }}>✨ SELTENER FUND ✨</div>
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
            <div style={{ color: 'var(--green)', fontWeight: 800, letterSpacing: 2, fontSize: 12 }}>NEUER ORT</div>
            <div className="big" style={{ marginTop: 10 }}>{moveModal.icon}</div>
            <h2>{moveModal.name}</h2>
            <p>{moveModal.desc}</p>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
              <span className="mg-lvl" style={{ color: 'var(--gold)' }}>🪙 {coinRange(moveModal)}</span>
              {moveModal.maxBet > 0 && <span className="mg-lvl">Max-Einsatz {fmt(moveModal.maxBet)} €</span>}
            </div>
            <button className="mg-btn green" onClick={() => setMoveModal(null)}>Los geht's!</button>
          </div>
        </div>
      )}

      <div className="mg-toasts">
        {toasts.map(t => <div key={t.id} className="mg-toast">{t.text}</div>)}
      </div>
    </div>
  );
}
