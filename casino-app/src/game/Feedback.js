import React, { useState } from 'react';
import { api } from '../api';
import { LOCATIONS, fmtMoney, fmtTime } from './economy';

const CATS = [
  { id: 'bug', label: '🐞 Bug' },
  { id: 'idee', label: '💡 Idee' },
  { id: 'balancing', label: '⚖️ Zu leicht/schwer' },
  { id: 'lob', label: '❤️ Lob' },
  { id: 'sonstiges', label: '💬 Sonstiges' },
];
const DEMO = process.env.REACT_APP_DEMO === 'true';

export default function Feedback({ state, onClose }) {
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState('idee');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(null); // null | 'sending' | 'done' | Fehlertext

  const send = async () => {
    if (message.trim().length < 3) { setStatus('Bitte schreib ein paar Worte.'); return; }
    setStatus('sending');
    const context = `${LOCATIONS[state.location].name} · ${fmtMoney(state.money)} · Spielzeit ${fmtTime(state.stats.playTime)} · ${state.stats.finds} Münzen · ${(state.achievements || []).length} Erfolge`;
    try {
      const res = await api.sendFeedback({ rating: rating || 3, category, message, context });
      setStatus(res.error ? res.error : 'done');
    } catch {
      setStatus('Senden hat nicht geklappt. Prüf deine Verbindung und versuch es nochmal.');
    }
  };

  return (
    <div className="mg-modal-bg" onClick={onClose}>
      <div className="mg-modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'left' }}>
        {status === 'done' ? (
          <div style={{ textAlign: 'center' }}>
            <div className="big">💌</div>
            <h2>Danke!</h2>
            <p>Dein Feedback ist angekommen.</p>
            <button className="mg-btn green" onClick={onClose}>Weiterspielen</button>
          </div>
        ) : (
          <>
            <h2 style={{ marginTop: 0, textAlign: 'center' }}>💬 Feedback</h2>
            {DEMO && <p style={{ textAlign: 'center' }}>In dieser Demo-Version kann kein Feedback verschickt werden.</p>}
            <div className="mg-label">Wie gefällt dir das Spiel?</div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 14 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setRating(n)} aria-label={`${n} Sterne`}
                  style={{ fontSize: 34, background: 'none', border: 'none', cursor: 'pointer', filter: n <= rating ? 'none' : 'grayscale(1) brightness(.5)', transform: n <= rating ? 'scale(1.1)' : 'none', transition: 'transform .1s' }}>⭐</button>
              ))}
            </div>
            <div className="mg-label">Worum geht's?</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {CATS.map(c => (
                <button key={c.id} className="mg-btn-ghost" onClick={() => setCategory(c.id)}
                  style={category === c.id ? { background: 'linear-gradient(180deg,#ffe58a,#ffb72a)', color: '#3a1d00', borderColor: '#ffd65c' } : undefined}>{c.label}</button>
              ))}
            </div>
            <label className="mg-label" htmlFor="fb-msg">Deine Nachricht</label>
            <textarea id="fb-msg" value={message} onChange={e => setMessage(e.target.value)} maxLength={2000} rows={5}
              placeholder="Was ist dir aufgefallen? Was macht Spaß, was nervt?"
              style={{ width: '100%', padding: 12, borderRadius: 12, border: '2px solid var(--border)', background: '#0c0720', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, resize: 'vertical' }} />
            {status && status !== 'sending' && <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{status}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="mg-btn-ghost" style={{ flex: 1 }} onClick={onClose}>Abbrechen</button>
              <button className="mg-btn green" style={{ flex: 2 }} disabled={DEMO || status === 'sending'} onClick={send}>{status === 'sending' ? 'Sende…' : 'Abschicken'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
