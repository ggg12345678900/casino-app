import React, { useState } from 'react';
import { api } from './api';

function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username || !password) return setError('Bitte alle Felder ausfüllen!');
    setLoading(true);
    setError('');

    const res = mode === 'login'
      ? await api.login(username, password)
      : await api.register(username, password);

    setLoading(false);

    if (res.error) return setError(res.error);

    localStorage.setItem('token', res.token);
    onLogin(res);
  };

  return (
    <div style={{
      backgroundColor: '#0f1923', minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif"
    }}>
      <div style={{ width: '380px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px' }}>🎰</div>
          <div style={{ color: '#00e701', fontWeight: 'bold', fontSize: '28px', letterSpacing: '2px' }}>CasinoSim</div>
          <div style={{ color: '#8a9bb0', fontSize: '14px', marginTop: '4px' }}>Spielgeld Casino — Kein Echtgeld</div>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: '#1a2c38', borderRadius: '16px', padding: '32px' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: '24px', backgroundColor: '#0f1923', borderRadius: '10px', padding: '4px' }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1, padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                  backgroundColor: mode === m ? '#2d4a5a' : 'transparent',
                  color: mode === m ? 'white' : '#8a9bb0', fontWeight: 'bold', fontSize: '14px'
                }}>
                {m === 'login' ? '🔑 Login' : '📝 Registrieren'}
              </button>
            ))}
          </div>

          {/* Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ color: '#8a9bb0', fontSize: '12px', display: 'block', marginBottom: '6px' }}>BENUTZERNAME</label>
              <input value={username} onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Dein Username..."
                style={{ width: '100%', padding: '12px', backgroundColor: '#0f1923', border: '1px solid #2d4a5a', color: 'white', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ color: '#8a9bb0', fontSize: '12px', display: 'block', marginBottom: '6px' }}>PASSWORT</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Dein Passwort..."
                style={{ width: '100%', padding: '12px', backgroundColor: '#0f1923', border: '1px solid #2d4a5a', color: 'white', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#ff444422', border: '1px solid #ff4444', borderRadius: '8px', color: '#ff4444', fontSize: '13px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {/* Button */}
          <button onClick={handleSubmit} disabled={loading}
            style={{ width: '100%', marginTop: '20px', padding: '14px', backgroundColor: loading ? '#555' : '#00e701', border: 'none', color: loading ? '#aaa' : '#000', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
            {loading ? '⏳ Laden...' : mode === 'login' ? '🔑 Einloggen' : '🚀 Account erstellen'}
          </button>

          {/* Admin Hint */}
          
        </div>
      </div>
    </div>
  );
}

export default Login;