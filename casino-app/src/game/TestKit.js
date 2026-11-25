import React, { useState } from 'react';
import { TREE, treeOwned } from './tree';
import { LOCATIONS, fmtMoney } from './economy';
import { sfx } from './sound';

// Test-Menü – nur in der lokalen Testversion (REACT_APP_TESTKIT=true), nie online
export const TESTKIT = process.env.REACT_APP_TESTKIT === 'true';

export default function TestKit({ state, game }) {
  const [open, setOpen] = useState(false);
  if (!TESTKIT) return null;
  const nextLoc = LOCATIONS[state.location + 1];
  const act = (fn) => { sfx.buy(); fn(); };
  const buyAll = (branch) => {
    game.setJetons(j => j + 10000);
    setTimeout(() => {
      TREE.filter(n => !branch || n.b === branch).sort((a, b) => a.r - b.r).forEach(n => { if (!treeOwned(state, n.id)) game.buyTreeNode(n.id); });
    }, 50);
  };
  return (
    <>
      <button className="mg-testkit-btn" onClick={() => setOpen(o => !o)} aria-label="Test-Menü">🧪</button>
      {open && (
        <div className="mg-testkit">
          <div className="hd">🧪 Test-Menü <small>nur in der Testversion</small></div>
          <button onClick={() => act(() => game.setJetons(j => j + 100))}>+100 Jetons</button>
          <button onClick={() => act(() => game.setJetons(j => j + 1000))}>+1.000 Jetons</button>
          <button onClick={() => act(() => game.setBalance(m => m + (nextLoc ? nextLoc.cost : m)))}>{nextLoc ? `+ Geld für ${nextLoc.icon} ${nextLoc.name} (${fmtMoney(nextLoc.cost)})` : 'Geld verdoppeln'}</button>
          <button onClick={() => act(() => game.skipTutorial())}>Tutorial überspringen</button>
          <button onClick={() => act(() => buyAll(null))}>🌳 Alle 100 Skills kaufen</button>
          <div className="row">
            {['feld', 'combo', 'glueck', 'helfer', 'jeton'].map(b => (
              <button key={b} onClick={() => act(() => buyAll(b))}>{{ feld: '🪙', combo: '🔥', glueck: '🍀', helfer: '🤖', jeton: '🟣' }[b]} alle</button>
            ))}
          </div>
          <button onClick={() => act(() => game.setFrenzy())}>🌧️ Geldregen starten</button>
        </div>
      )}
    </>
  );
}
