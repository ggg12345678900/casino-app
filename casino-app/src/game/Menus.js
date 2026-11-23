import React, { useState, useEffect } from 'react';
import './game.css';
import { GAME_NAME, GAME_TAGLINE, GAME_ICON, GAME_AUTHOR } from '../brand';
import { PasswordForm } from './Views';
import { hasToken } from '../api';
import { getSettings, updateSettings, onSettings } from './settings';
import { sfx, music } from './sound';

export function useSettings() {
  const [s, setS] = useState(getSettings());
  useEffect(() => onSettings(setS), []);
  return s;
}

export function Logo({ big }) {
  return (
    <div className={`mg-title-logo${big ? ' big' : ''}`}>
      <div className="hat">{GAME_ICON}</div>
      <div className="word">{GAME_NAME}</div>
    </div>
  );
}

// Ladebildschirm (Spielstand laden / Server wacht auf)
export function LoadingScreen({ text = 'Lade Spielstand…' }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSlow(true), 4000); return () => clearTimeout(t); }, []);
  return (
    <div className="mg mg-center">
      <Logo big />
      <div className="mg-loader"><span /><span /><span /></div>
      <div className="mg-loading-text">{text}</div>
      {slow && <div className="mg-loading-sub">Der Server wacht gerade auf – das kann beim ersten Mal bis zu einer Minute dauern.</div>}
    </div>
  );
}

// Startbildschirm / Hauptmenü
export function TitleScreen({ user, onPlay, onSettings, onCredits, onLogout }) {
  return (
    <div className="mg-title">
      <div className="mg-title-bg" />
      <Logo big />
      <div className="mg-title-tag">{GAME_TAGLINE}</div>
      <div className="mg-title-menu">
        <button className="mg-btn green big" data-tut="play" onClick={() => { sfx.buy(); music.start(); onPlay(); }}>▶ Spielen</button>
        <button className="mg-btn-ghost" onClick={() => { sfx.click(); onSettings(); }}>⚙️ Einstellungen</button>
        <button className="mg-btn-ghost" onClick={() => { sfx.click(); onCredits(); }}>ℹ️ Über das Spiel</button>
        {onLogout && <button className="mg-btn-ghost" onClick={onLogout}>🚪 Abmelden</button>}
      </div>
      {user && <div className="mg-title-user">Angemeldet als <b>{user.username}</b></div>}
      <div className="mg-title-foot">Nur Spielgeld · kein echtes Glücksspiel</div>
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button className={`mg-toggle${on ? ' on' : ''}`} role="switch" aria-checked={on} onClick={() => { sfx.click(); onChange(!on); }}>
      <span />
    </button>
  );
}

function Slider({ value, onChange, label }) {
  return (
    <input type="range" min="0" max="1" step="0.05" value={value} aria-label={label} className="mg-range"
      style={{ '--p': `${value * 100}%` }} onChange={e => onChange(+e.target.value)} />
  );
}

// Einstellungen (als Fenster – im Spiel und im Hauptmenü)
export function SettingsModal({ onClose, user, onLogout, onFeedback, onReset, onMenu }) {
  const s = useSettings();
  const [confirmReset, setConfirmReset] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  return (
    <div className="mg-modal-bg" onClick={onClose}>
      <div className="mg-modal mg-settings" onClick={e => e.stopPropagation()}>
        <button className="mg-x" onClick={onClose} aria-label="Schließen">✕</button>
        <h2>⚙️ Einstellungen</h2>

        <div className="mg-set-group">
          <div className="mg-set-row">
            <span>🔊 Soundeffekte</span>
            <Slider label="Soundeffekte" value={s.sfx} onChange={v => { updateSettings({ sfx: v }); sfx.coin(); }} />
          </div>
          <div className="mg-set-row">
            <span>🎵 Musik</span>
            <Slider label="Musik" value={s.music} onChange={v => updateSettings({ music: v })} />
          </div>
          {canVibrate && (
            <div className="mg-set-row"><span>📳 Vibration</span><Toggle on={s.vibrate} onChange={v => updateSettings({ vibrate: v })} /></div>
          )}
          <div className="mg-set-row">
            <span>✨ Weniger Effekte<small>schont Akku und ältere Handys</small></span>
            <Toggle on={s.lowFx} onChange={v => updateSettings({ lowFx: v })} />
          </div>
          <div className="mg-set-row">
            <span>🔢 Zahlen</span>
            <div className="mg-seg">
              {[['de', '1,25 Mio'], ['short', '1.25M']].map(([k, l]) => (
                <button key={k} className={s.numbers === k ? 'active' : ''} onClick={() => { sfx.click(); updateSettings({ numbers: k }); }}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="mg-set-group">
          {user && hasToken() && (pwOpen
            ? <div className="mg-confirm" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,.25)' }}><PasswordForm /></div>
            : <button className="mg-btn-ghost wide" onClick={() => setPwOpen(true)}>🔑 Passwort ändern</button>)}
          {onFeedback && <button className="mg-btn-ghost wide" onClick={onFeedback}>💬 Feedback geben</button>}
          {onMenu && <button className="mg-btn-ghost wide" onClick={onMenu}>🏠 Hauptmenü</button>}
          {onLogout && <button className="mg-btn-ghost wide" onClick={onLogout}>🚪 Abmelden{user ? ` (${user.username})` : ''}</button>}
          {onReset && (confirmReset ? (
            <div className="mg-confirm">
              <div>Wirklich alles löschen und von vorne anfangen?</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="mg-btn red" onClick={() => { onReset(); onClose(); }}>Ja, neu starten</button>
                <button className="mg-btn-ghost" onClick={() => setConfirmReset(false)}>Abbrechen</button>
              </div>
            </div>
          ) : (
            <button className="mg-btn-ghost wide danger" onClick={() => setConfirmReset(true)}>🗑️ Spielstand zurücksetzen</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CreditsModal({ onClose }) {
  return (
    <div className="mg-modal-bg" onClick={onClose}>
      <div className="mg-modal" onClick={e => e.stopPropagation()}>
        <button className="mg-x" onClick={onClose} aria-label="Schließen">✕</button>
        <div className="big">{GAME_ICON}</div>
        <h2>{GAME_NAME}</h2>
        <div className="mg-about">
          <p><b>{GAME_NAME}</b> ist ein Incremental-Game mit Casino: Du startest mit nichts, sammelst Cent für Cent vom Boden,
            stellst Helfer ein und ziehst vom dreckigen Hinterhof über Las Vegas und Monaco bis ins Mond-Casino.</p>
          <p>Unterwegs warten 15 Casino-Spiele, ein gemeinsamer Jackpot für alle Spieler, Erfolge und eine Rangliste.</p>
          <p>Alle Einsätze sind <b>nur Spielgeld</b> – es gibt nichts zu kaufen und nichts auszuzahlen.</p>
          <p className="mg-about-dev">Das Spiel befindet sich in der Testphase. Feedback hilft enorm – einfach über 💬 schicken!</p>
          <div className="mg-author">Ein Projekt von <b>{GAME_AUTHOR}</b></div>
        </div>
        <button className="mg-btn" onClick={onClose}>Alles klar</button>
      </div>
    </div>
  );
}
