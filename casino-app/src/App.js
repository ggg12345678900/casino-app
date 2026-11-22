import React, { useState, useEffect } from 'react';
import Login from './Login';
import GameApp from './game/GameApp';
import { api } from './api';

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

  if (checking) return <div style={{ background: '#0b1118', minHeight: '100vh' }} />;
  if (!user) return <Login onLogin={setUser} />;
  return <GameApp key={user.id} user={user} onLogout={logout} />;
}

export default App;
