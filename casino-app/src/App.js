import React, { useState, useEffect } from 'react';
import Login from './Login';
import GameApp from './game/GameApp';
import { LoadingScreen } from './game/Menus';
import AdminDashboard from './game/AdminDashboard';
import CrashGuard from './game/CrashGuard';
import { api } from './api';

// Demo-Build (REACT_APP_DEMO=true): kein Server, kein Login, Spielstand nur im Browser
const DEMO = process.env.REACT_APP_DEMO === 'true';
const DEMO_USER = { id: 'demo', username: 'Demo-Spieler' };

function App() {
  return <CrashGuard><AppInner /></CrashGuard>;
}

function AppInner() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(!!localStorage.getItem('token'));
  const [adminPlays, setAdminPlays] = useState(false);

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
    setAdminPlays(false);
  };

  if (DEMO) return <GameApp user={DEMO_USER} onLogout={() => window.location.reload()} />;
  if (checking) return <LoadingScreen text="Anmelden…" />;
  if (!user) return <Login onLogin={setUser} />;
  // Admin: zuerst die Admin-Zentrale, das Spiel nur auf Knopfdruck
  if (user.is_admin && !adminPlays) return <AdminDashboard user={user} onPlay={() => setAdminPlays(true)} onLogout={logout} />;
  return <GameApp key={user.id} user={user} onLogout={logout} onAdmin={user.is_admin ? () => setAdminPlays(false) : null} />;
}

export default App;
