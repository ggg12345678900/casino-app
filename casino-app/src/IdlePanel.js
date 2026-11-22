import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import { IDLE_BUSINESSES, IDLE_OFFLINE_CAP_SEC, idleCost, fmt } from './progression';

/**
 * Idle-Business: Gebäude kaufen → passives Einkommen pro Sekunde,
 * auch offline (max. 8h). Der Server rechnet verbindlich, hier wird
 * der Zähler nur lokal hochgezählt bis zum nächsten Claim.
 */
export default function IdlePanel({ balance, prestigeCount, globalLevels, onBalanceUpdate }) {
  const [levels, setLevels] = useState({});
  const [rate, setRate] = useState(0);
  const [base, setBase] = useState({ pending: 0, at: Date.now() });
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(null);
  const [offlineMsg, setOfflineMsg] = useState(null);

  const load = useCallback(async (showOffline) => {
    const res = await api.idle();
    if (res.error) return;
    setLevels(JSON.parse(res.idle_levels || '{}'));
    setRate(res.rate);
    setBase({ pending: res.pending, at: Date.now() });
    if (showOffline && res.pending > 0 && res.seconds > 60) {
      const h = Math.floor(res.seconds / 3600);
      const m = Math.floor((res.seconds % 3600) / 60);
      setOfflineMsg(`Während du weg warst (${h > 0 ? h + 'h ' : ''}${m}min) hat dein Casino ${fmt(Math.floor(res.pending))}€ verdient!`);
    }
  }, []);

  // Beim Öffnen laden; neu laden wenn sich Multiplikatoren ändern (Prestige / Global-Upgrade)
  useEffect(() => { load(true); }, [load]);
  useEffect(() => { load(false); }, [load, prestigeCount, globalLevels]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const pending = Math.min(base.pending + rate * Math.max(0, now - base.at) / 1000, rate * IDLE_OFFLINE_CAP_SEC);
  const atCap = rate > 0 && pending >= rate * IDLE_OFFLINE_CAP_SEC - 0.01;
  const totalOwned = Object.values(levels).reduce((a, b) => a + b, 0);

  const claim = async () => {
    if (pending < 0.01 || loading) return;
    setLoading('claim');
    const res = await api.idleClaim();
    setLoading(null);
    if (res.error) { alert(res.error); return; }
    onBalanceUpdate(res.balance);
    setRate(res.rate);
    setBase({ pending: 0, at: Date.now() });
    setOfflineMsg(null);
  };

  const buy = async (biz) => {
    if (loading) return;
    setLoading(biz.id);
    const res = await api.idleBuy(biz.id);
    setLoading(null);
    if (res.error) { alert(res.error); return; }
    onBalanceUpdate(res.balance);
    setLevels(JSON.parse(res.idle_levels));
    setRate(res.rate);
    setBase({ pending: 0, at: Date.now() });
  };

  // Nächstes Business erst sichtbar, wenn das vorherige mind. 1x gekauft wurde
  const visible = IDLE_BUSINESSES.filter((b, i) => i === 0 || (levels[IDLE_BUSINESSES[i - 1].id] || 0) > 0);
  const nextLocked = IDLE_BUSINESSES[visible.length];
  const multiplier = rate > 0 ? rate / Math.max(1, IDLE_BUSINESSES.reduce((s, b) => s + (levels[b.id] || 0) * b.income, 0)) : 1;

  return (
    <div style={{ padding: '16px 24px 0' }}>
      <div style={{ color: '#475569', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
        🏢 Dein Casino-Imperium {totalOwned > 0 && <span style={{ color: '#64748b' }}>· {totalOwned} Businesses</span>}
      </div>

      {offlineMsg && (
        <div style={{ background: '#22c55e18', border: '1px solid #22c55e55', color: '#4ade80', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 10 }}>
          💤 {offlineMsg}
        </div>
      )}

      {/* Einnahmen-Karte */}
      <div style={{
        background: 'linear-gradient(135deg, #14532d55 0%, #1a2c38 100%)', border: '1px solid #22c55e44',
        borderRadius: 12, padding: '16px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#64748b', fontSize: 11 }}>EINKOMMEN</div>
          <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: 18 }}>
            {fmt(Math.round(rate * 10) / 10)}€/s
            {multiplier > 1.001 && <span style={{ color: '#f59e0b', fontSize: 12, marginLeft: 8 }}>×{multiplier.toFixed(2)}</span>}
          </div>
          <div style={{ color: '#64748b', fontSize: 11, marginTop: 6 }}>
            ANGESAMMELT {atCap && <span style={{ color: '#f87171' }}>· Limit (8h) erreicht!</span>}
          </div>
          <div style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>
            {pending < 1000 ? pending.toFixed(2) : fmt(Math.floor(pending))}€
          </div>
        </div>
        <button onClick={claim} disabled={pending < 0.01 || loading === 'claim'}
          style={{
            padding: '14px 22px', border: 'none', borderRadius: 10, fontWeight: 'bold', fontSize: 14,
            background: pending >= 0.01 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : '#2d4a5a',
            color: pending >= 0.01 ? '#0f1923' : '#64748b', cursor: pending >= 0.01 ? 'pointer' : 'not-allowed',
            boxShadow: pending >= 0.01 ? '0 0 20px #22c55e44' : 'none',
          }}>
          {loading === 'claim' ? '...' : '💰 Einsammeln'}
        </button>
      </div>

      {/* Businesses */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
        {visible.map(biz => {
          const owned = levels[biz.id] || 0;
          const cost = idleCost(biz, owned);
          const canAfford = balance + pending >= cost;
          return (
            <div key={biz.id} style={{ background: '#1a2c38', border: '1px solid #2d4a5a', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 24 }}>{biz.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: 13 }}>{biz.name}</div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>+{fmt(biz.income)}€/s je Stück</div>
                </div>
                <span style={{ color: owned > 0 ? '#4ade80' : '#475569', fontWeight: 'bold', fontSize: 15 }}>×{owned}</span>
              </div>
              <button onClick={() => buy(biz)} disabled={!canAfford || !!loading}
                style={{
                  padding: '7px', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 'bold',
                  background: canAfford ? '#22c55e' : '#2d4a5a', color: canAfford ? '#0f1923' : '#64748b',
                  cursor: canAfford ? 'pointer' : 'not-allowed', opacity: loading === biz.id ? 0.6 : 1,
                }}>
                {loading === biz.id ? '...' : `Kaufen · ${fmt(cost)}€`}
              </button>
            </div>
          );
        })}
        {nextLocked && (
          <div style={{ background: '#131e28', border: '1px dashed #2d4a5a', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#475569' }}>
            <span style={{ fontSize: 24, filter: 'grayscale(1)' }}>🔒</span>
            <div style={{ fontSize: 12 }}>Kauf {IDLE_BUSINESSES[visible.length - 1].name} um das nächste Business zu entdecken</div>
          </div>
        )}
      </div>
    </div>
  );
}
