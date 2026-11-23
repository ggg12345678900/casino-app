import React, { useState, useEffect } from 'react';
import Login from './Login';
import GameApp from './game/GameApp';
import { LoadingScreen } from './game/Menus';
import { api } from './api';

// Demo-Build (REACT_APP_DEMO=true): kein Server, kein Login, Spielstand nur im Browser
const DEMO = process.env.REACT_APP_DEMO === 'true';
const DEMO_USER = { id: 'demo', username: 'Demo-Spieler' };

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api.profile()
      .then(data => {
        if (!data.error) setUser(data);
        else localStorage.removeItem('token');
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (DEMO) return <GameApp user={DEMO_USER} onLogout={() => window.location.reload()} />;
  if (checking) return <LoadingScreen text="Anmelden…" />;
  if (!user) return <Login onLogin={setUser} />;
  return <GameApp key={user.id} user={user} onLogout={logout} />;
}

export default App;
