import React, { useState, useEffect } from 'react';
import { api, wakeServer } from './api';
import { Logo } from './game/Menus';
import { GAME_TAGLINE } from './brand';

function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);

  // Server schon beim Öffnen der Seite aufwecken, damit der Login schneller geht
  useEffect(() => { wakeServer(); }, []);

  const handleSubmit = async () => {
    if (!username || !password) return setError('Bitte alle Felder ausfüllen!');
    setLoading(true);
    setError('');
    const slowTimer = setTimeout(() => setSlow(true), 4000);

    let res;
    try {
      res = mode === 'login'
        ? await api.login(username, password)
        : await api.register(username, password);
    } catch {
      res = { error: 'Server nicht erreichbar. Er wacht vielleicht gerade auf – warte 30 Sekunden und versuch es nochmal.' };
    }
    clearTimeout(slowTimer);
    setSlow(false);
    setLoading(false);

    if (!res || res.error) return setError((res && res.error) || 'Unbekannter Fehler – bitte nochmal versuchen.');

    localStorage.setItem('token', res.token);
    onLogin(res);
  };

  return (
    <div className="mg mg-center mg-login">
      <Logo big />
      <div className="mg-title-tag" style={{ marginBottom: 18 }}>{GAME_TAGLINE} · nur Spielgeld</div>
      <div className="mg-modal" style={{ animation: 'none' }}>
        <div className="mg-subtabs">
          {['login', 'register'].map(m => (
            <button key={m} className={mode === m ? 'active' : ''} onClick={() => { setMode(m); setError(''); }}>
              {m === 'login' ? '🔑 Login' : '📝 Neu hier'}
            </button>
          ))}
        </div>
        <label className="mg-field">
          <span>Benutzername</span>
          <input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Dein Name im Spiel" autoComplete="username" />
        </label>
        <label className="mg-field">
          <span>Passwort</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Dein Passwort" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>
        {error && <div className="mg-login-error">{error}</div>}
        <button className="mg-btn green" style={{ width: '100%', marginTop: 16 }} onClick={handleSubmit} disabled={loading}>
          {loading ? (slow ? '⏳ Server wacht auf… (bis zu 1 Minute)' : '⏳ Laden…') : mode === 'login' ? '🔑 Einloggen' : '🚀 Account erstellen'}
        </button>
      </div>
    </div>
  );
}

export default Login;
