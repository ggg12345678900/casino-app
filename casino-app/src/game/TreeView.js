import React, { useState } from 'react';
import { TREE, TREE_BRANCHES, treeOwned, treeCanReach, treeCount, treeNode } from './tree';
import { fmtJetons } from './Views';
import { sfx } from './sound';

// Raster einer Spalte: 3 Spalten × 8 Reihen
const COL_W = 76;
const ROW_H = 78;
const W = COL_W * 3;
const H = ROW_H * 8;
const cx = (c) => c * COL_W + COL_W / 2;
const cy = (r) => r * ROW_H + ROW_H / 2;

function Branch({ branch, state, sel, onSel, dim }) {
  const nodes = TREE.filter(n => n.b === branch.id);
  const have = nodes.filter(n => treeOwned(state, n.id)).length;
  const links = [];
  nodes.forEach(n => {
    (n.reqAll || (n.req ? [n.req] : [])).forEach(rid => {
      const p = treeNode(rid);
      links.push({ k: `${rid}>${n.id}`, x1: cx(p.c), y1: cy(p.r), x2: cx(n.c), y2: cy(n.r), on: treeOwned(state, n.id), open: treeOwned(state, rid) });
    });
  });
  return (
    <div className={`tv-branch${dim ? ' dim' : ''}`} style={{ '--bc': branch.color }}>
      <div className="tv-bhead">
        <span className="ic">{branch.icon}</span>
        <span className="nm">{branch.name}</span>
        <span className="ct">{have}/{nodes.length}</span>
      </div>
      <div className="tv-grid" style={{ width: W, height: H }}>
        <svg className="tv-links" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          {links.map(l => <line key={l.k} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} className={l.on ? 'on' : l.open ? 'open' : ''} />)}
        </svg>
        {nodes.map(n => {
          const own = treeOwned(state, n.id);
          const reach = treeCanReach(state, n);
          const afford = reach && !own && (state.jetons || 0) >= n.cost;
          const st = own ? 'own' : reach ? (afford ? 'can' : 'open') : 'locked';
          return (
            <button key={n.id} data-tut={`tree-${n.id}`}
              className={`tv-node ${st}${n.r === 7 ? ' cap' : ''}${sel === n.id ? ' sel' : ''}`}
              style={{ left: cx(n.c), top: cy(n.r) }}
              onClick={() => { sfx.click(); onSel(n.id); }} aria-label={`${n.name}${own ? ' (gekauft)' : ''}`}>
              <span className="ic">{st === 'locked' ? '🔒' : n.icon}</span>
              {!own && reach && <span className="cost">{n.cost}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TreeView({ state, onBuy }) {
  const [branch, setBranch] = useState('feld');
  const [sel, setSel] = useState('feld-0-1');
  const [flash, setFlash] = useState(null);
  const node = treeNode(sel);
  const own = node && treeOwned(state, node.id);
  const reach = node && treeCanReach(state, node);
  const can = node && reach && !own && (state.jetons || 0) >= node.cost;
  const bInfo = node && TREE_BRANCHES.find(b => b.id === node.b);
  const need = node && !reach && (node.reqAll ? 'Brauchst alle drei Knoten darüber' : `Brauchst zuerst: ${treeNode(node.req).name}`);
  const buy = () => {
    if (!can) { sfx.nope(); return; }
    if (onBuy(node.id)) { sfx.levelUp(); setFlash(node.id); setTimeout(() => setFlash(null), 900); }
  };
  const pickBranch = (id) => {
    sfx.click(); setBranch(id);
    const first = TREE.filter(n => n.b === id).find(n => !treeOwned(state, n.id) && treeCanReach(state, n)) || TREE.find(n => n.b === id);
    setSel(first.id);
  };
  return (
    <div className="mg-panel tv">
      <div className="tv-top">
        <div>
          <div className="mg-label" style={{ marginBottom: 2 }}>🌳 Skilltree</div>
          <div className="tv-sub">100 Fähigkeiten, die das Spiel verändern. Bezahlt wird mit Jetons. {treeCount(state)}/100 freigeschaltet.</div>
        </div>
        <div className="cs-jbal">{fmtJetons(state.jetons || 0)}</div>
      </div>
      <div className="tv-chips" role="tablist">
        {TREE_BRANCHES.map(b => (
          <button key={b.id} role="tab" aria-selected={branch === b.id} className={branch === b.id ? 'active' : ''} style={{ '--bc': b.color }} onClick={() => pickBranch(b.id)}>
            {b.icon} {b.name}
          </button>
        ))}
      </div>
      <div className="tv-board" data-branch={branch}>
        {TREE_BRANCHES.map(b => (
          <div key={b.id} className={`tv-col${branch === b.id ? ' active' : ''}`}>
            <Branch branch={b} state={state} sel={sel} onSel={(id) => { setSel(id); setBranch(b.id); }} dim={branch !== b.id} />
          </div>
        ))}
      </div>
      {node && (
        <div className={`tv-detail${flash === node.id ? ' bought' : ''}`} style={{ '--bc': bInfo.color }}>
          <div className="ic">{node.icon}</div>
          <div className="body">
            <div className="nm">{node.name} <span className="br">{bInfo.icon} {bInfo.name}{node.r === 7 ? ' · Meisterknoten' : ''}</span></div>
            <div className="ds">{node.desc}</div>
            {need && <div className="need">🔒 {need}</div>}
          </div>
          {own
            ? <div className="done">✔ Aktiv</div>
            : <button className={`mg-btn${can ? ' green' : ''}`} disabled={!reach} onClick={buy}>{fmtJetons(node.cost)}</button>}
        </div>
      )}
    </div>
  );
}
