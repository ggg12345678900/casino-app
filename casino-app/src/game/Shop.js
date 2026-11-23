import React, { useState } from 'react';
import {
  HELPERS, TOOLS, LOCATIONS,
  helperCostN, maxAffordable, nextMilestone, HELPER_MILESTONES, fmt, fmtMoney,
} from './economy';
import { coinRange } from './Views';

const TOOL_EFFECT = {
  spawn: (x) => `${Math.round((x - 1) * 100)}% mehr Münzen`,
  value: (x) => `Münzwert ×${x}`,
  pick: (x) => `Aufheben bringt ×${x}`,
  helper: (x) => `Alle Helfer ×${x}`,
  all: (x) => `ALLES ×${x}`,
};

function Helpers({ state, derived, onBuy, hl }) {
  const [qty, setQty] = useState(1);
  const visible = HELPERS.filter(h => h.loc <= state.location);
  const teaser = HELPERS.find(h => h.loc > state.location);

  return (
    <>
      <div className="mg-qty">
        {[1, 10, 100, 'max'].map(q => (
          <button key={q} className={qty === q ? 'active' : ''} onClick={() => setQty(q)}>{q === 'max' ? 'Max' : `×${q}`}</button>
        ))}
      </div>
      {visible.map(h => {
        const owned = state.helpers[h.id] || 0;
        const n = qty === 'max' ? Math.max(1, maxAffordable(h, owned, state.money)) : qty;
        const cost = helperCostN(h, owned, n);
        const can = state.money >= cost;
        const nm = nextMilestone(owned);
        const prevM = [0, ...HELPER_MILESTONES].filter(m => m <= owned).pop();
        const rate = derived.helperRates[h.id];
        const each = h.speed * derived.helperMult;
        return (
          <button key={h.id} data-tut={`helper-${h.id}`} className={`mg-item ${can ? 'can' : 'poor'}${hl === `helper-${h.id}` ? ' mg-hl' : ''}`} onClick={() => can && onBuy(h.id, n)}>
            <div className="ic">{h.icon}</div>
            <div className="body">
              <div className="name">{h.name}</div>
              <div className="desc">
                {owned > 0
                  ? <>{fmt(rate, 1)} Münzen/s · <span style={{ color: 'var(--green)' }}>{fmtMoney(derived.helperIncome[h.id])}/s</span></>
                  : <>+{fmt(each, 2)} Münzen/s je Stück</>}
                <div style={{ color: 'var(--dim)' }}>🪙 sammelt {coinRange(LOCATIONS[h.loc])}</div>
              </div>
              {nm && (
                <>
                  <div className="ms"><div style={{ width: `${((owned - prevM) / (nm - prevM)) * 100}%` }} /></div>
                  <div className="desc" style={{ fontSize: 10 }}>Bei {nm} Stück: Tempo ×2</div>
                </>
              )}
            </div>
            <div className="right">
              <div className="count">{owned}</div>
              <div className="price">{n > 1 ? `×${n} · ` : ''}{fmtMoney(cost)}</div>
            </div>
          </button>
        );
      })}
      {teaser && (
        <div className="mg-item locked">
          <div className="ic">{teaser.icon}</div>
          <div className="body">
            <div className="name">???</div>
            <div className="desc">🔒 Freigeschaltet in: {LOCATIONS[teaser.loc].icon} {LOCATIONS[teaser.loc].name}</div>
          </div>
        </div>
      )}
    </>
  );
}

function Tools({ state, onBuy, hl }) {
  const available = TOOLS.filter(t => t.loc <= state.location && !state.tools.includes(t.id)).sort((a, b) => a.cost - b.cost);
  const owned = TOOLS.filter(t => state.tools.includes(t.id));
  const lockedCount = TOOLS.filter(t => t.loc > state.location).length;
  const nextLockLoc = TOOLS.find(t => t.loc > state.location)?.loc;

  return (
    <>
      {available.length === 0 && (
        <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 16 }}>Alle Werkzeuge hier gekauft. Zieh weiter, um neue zu entdecken!</div>
      )}
      {available.map(t => {
        const can = state.money >= t.cost;
        return (
          <button key={t.id} data-tut={`tool-${t.id}`} className={`mg-item ${can ? 'can' : 'poor'}${hl === `tool-${t.id}` ? ' mg-hl' : ''}`} onClick={() => can && onBuy(t.id)}>
            <div className="ic">{t.icon}</div>
            <div className="body">
              <div className="name">{t.name}</div>
              <div className="desc" style={{ color: 'var(--gold)', fontWeight: 700 }}>{TOOL_EFFECT[t.type](t.x)}</div>
              <div className="desc">{t.desc}</div>
            </div>
            <div className="right"><div className="price">{fmtMoney(t.cost)}</div></div>
          </button>
        );
      })}
      {lockedCount > 0 && (
        <div className="mg-item locked">
          <div className="ic">🔒</div>
          <div className="body">
            <div className="name">{lockedCount} weitere Werkzeuge</div>
            <div className="desc">Nächste in: {LOCATIONS[nextLockLoc].icon} {LOCATIONS[nextLockLoc].name}</div>
          </div>
        </div>
      )}
      {owned.length > 0 && (
        <>
          <div className="mg-label" style={{ marginTop: 14 }}>Im Besitz ({owned.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {owned.map(t => (
              <span key={t.id} title={`${t.name}: ${TOOL_EFFECT[t.type](t.x)}`} style={{ fontSize: 22, background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 6px' }}>{t.icon}</span>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default function Shop({ state, derived, onBuyHelper, onBuyTool, hl = '', showHelpers = true }) {
  const [tabSel, setTab] = useState('helpers');
  const tab = showHelpers ? tabSel : 'tools';
  const canHelpers = HELPERS.filter(h => h.loc <= state.location && state.money >= helperCostN(h, state.helpers[h.id] || 0, 1)).length;
  const canTools = TOOLS.filter(t => t.loc <= state.location && !state.tools.includes(t.id) && state.money >= t.cost).length;

  return (
    <div className="mg-panel mg-shop">
      <div className="mg-shop-tabs">
        {showHelpers && <button data-tut="shoptab-helpers" className={`mg-shop-tab ${tab === 'helpers' ? 'active' : ''}${tab !== 'helpers' && hl.startsWith('helper-') ? ' mg-hl' : ''}`} onClick={() => setTab('helpers')}>
          👥 Helfer {canHelpers > 0 && <span className="badge">{canHelpers}</span>}
        </button>}
        <button data-tut="shoptab-tools" className={`mg-shop-tab ${tab === 'tools' ? 'active' : ''}${tab !== 'tools' && hl.startsWith('tool-') ? ' mg-hl' : ''}`} onClick={() => setTab('tools')}>
          🛠️ Werkzeuge {canTools > 0 && <span className="badge">{canTools}</span>}
        </button>
      </div>
      {tab === 'helpers'
        ? <Helpers state={state} derived={derived} onBuy={onBuyHelper} hl={hl} />
        : <Tools state={state} onBuy={onBuyTool} hl={hl} />}
    </div>
  );
}
