import React, { useState, useEffect } from 'react';
import { api } from './api';

function AdminPanel({ onClose, currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [message, setMessage] = useState('');

  const loadUsers = async () => {
    const data = await api.admin.getUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleSetBalance = async (userId) => {
    await api.admin.setBalance(userId, parseFloat(editAmount));
    setMessage('✅ Balance gesetzt!');
    setEditId(null);
    loadUsers();
    setTimeout(() => setMessage(''), 2000);
  };

  const handleAddToSelf = async () => {
    await api.admin.addBalance(currentUser.id, parseFloat(addAmount));
    setMessage(`✅ +${addAmount}€ hinzugefügt!`);
    setAddAmount('');
    loadUsers();
    setTimeout(() => setMessage(''), 2000);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('User wirklich löschen?')) return;
    await api.admin.deleteUser(userId);
    loadUsers();
  };

  const winrate = (u) => u.total_bets > 0 ? ((u.total_wins / u.total_bets) * 100).toFixed(1) : '0.0';

  const lastSeen = (u) => {
    if (!u.last_seen) return 'Nie';
    const d = new Date(u.last_seen);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 2) return '🟢 Gerade online';
    if (diffMin < 60) return `vor ${diffMin} Min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `vor ${diffH} Std`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `vor ${diffD} Tag${diffD > 1 ? 'en' : ''}`;
    return d.toLocaleDateString('de-DE');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ backgroundColor: '#1a2c38', borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '800px', maxHeight: '85vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#f5a623' }}>👑 Admin Panel</h2>
          <button onClick={onClose} style={{ backgroundColor: 'transparent', border: 'none', color: '#8a9bb0', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>

        {message && (
          <div style={{ padding: '10px', backgroundColor: '#00e70122', border: '1px solid #00e701', borderRadius: '8px', color: '#00e701', marginBottom: '16px', textAlign: 'center' }}>
            {message}
          </div>
        )}

        {/* Add to self */}
        <div style={{ backgroundColor: '#0f1923', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ color: '#f5a623', fontWeight: 'bold', marginBottom: '10px' }}>💰 Guthaben zu meinem Account hinzufügen</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="number" value={addAmount} onChange={e => setAddAmount(e.target.value)}
              placeholder="Betrag in €"
              style={{ flex: 1, padding: '10px', backgroundColor: '#1a2c38', border: '1px solid #2d4a5a', color: 'white', borderRadius: '8px', fontSize: '15px' }} />
            <button onClick={handleAddToSelf} disabled={!addAmount}
              style={{ padding: '10px 20px', backgroundColor: '#f5a623', border: 'none', color: '#000', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              + Hinzufügen
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div style={{ color: '#8a9bb0', fontSize: '12px', letterSpacing: '1px', marginBottom: '10px' }}>ALLE BENUTZER</div>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#8a9bb0' }}>Laden...</div>
        ) : (
          users.map(u => (
            <div key={u.id} style={{ backgroundColor: '#0f1923', borderRadius: '10px', padding: '14px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontWeight: 'bold', color: u.is_admin ? '#f5a623' : 'white' }}>
                    {u.is_admin ? '👑 ' : ''}{u.username}
                  </span>
                  <span style={{ color: '#8a9bb0', fontSize: '12px', marginLeft: '8px' }}>seit {new Date(u.created_at).toLocaleDateString('de-DE')}</span>
                  <span style={{ color: '#8a9bb0', fontSize: '12px', marginLeft: '8px' }}>· {lastSeen(u)}</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: '#00e701' }}>💰 {u.balance.toFixed(2)}€</span>
                  <span style={{ color: '#8a9bb0' }}>🎲 {u.total_bets} Spiele</span>
                  <span style={{ color: '#8a9bb0' }}>📊 {winrate(u)}% Win</span>
                  <span style={{ color: '#f5a623' }}>🏆 {u.biggest_win.toFixed(2)}€</span>
                </div>
                {!u.is_admin && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {editId === u.id ? (
                      <>
                        <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                          style={{ width: '100px', padding: '6px', backgroundColor: '#1a2c38', border: '1px solid #2d4a5a', color: 'white', borderRadius: '6px' }} />
                        <button onClick={() => handleSetBalance(u.id)}
                          style={{ padding: '6px 12px', backgroundColor: '#00e701', border: 'none', color: '#000', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>✓</button>
                        <button onClick={() => setEditId(null)}
                          style={{ padding: '6px 12px', backgroundColor: '#2d4a5a', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditId(u.id); setEditAmount(u.balance); }}
                          style={{ padding: '6px 12px', backgroundColor: '#2d4a5a', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>✏️ Balance</button>
                        <button onClick={() => handleDelete(u.id)}
                          style={{ padding: '6px 12px', backgroundColor: '#ff444422', border: '1px solid #ff4444', color: '#ff4444', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AdminPanel;