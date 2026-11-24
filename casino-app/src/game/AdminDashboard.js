import React, { useCallback, useEffect, useState } from 'react';
import './game.css';
import { api } from '../api';
import { LOCATIONS, fmt, fmtMoney, fmtTime, albumPieces, ALBUM_TOTAL } from './economy';
import { GAME_NAME } from '../brand';

// ─── Admin-Zentrale: erscheint statt des Spiels, wenn sich der Admin einloggt ─────
const ago = (t) => {
  if (!t) return 'nie';
  const sec = Math.max(0, (Date.now() - new Date(t).getTime()) / 1000);
  if (sec < 60) return 'gerade eben';
  if (sec < 3600) return `vor ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `vor ${Math.floor(sec / 3600)} h`;
  return `vor ${Math.floor(sec / 86400)} Tagen`;
};
const date = (t) => (t ? new Date(t).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '–');
const randomPassword = () => {
  const words = ['Jackpot', 'Chip', 'Cent', 'Mond', 'Glueck', 'Royal', 'Neon', 'Taler'];
  return `${words[Math.floor(Math.random() * words.length)]}${Math.floor(1000 + Math.random() * 9000)}`;
};

function Stat({ icon, label, value, accent }) {
  return (
    <div className="ad-stat">
      <div className="ic">{icon}</div>
      <div className="v" style={accent ? { color: accent } : undefined}>{value}</div>
      <div className="k">{label}</div>
    </div>
  );
}

// 1 Übersicht + 2 Live-Liste
function Overview({ onOpen }) {
  const [o, setO] = useState(null);
  const [live, setLive] = useState([]);
  const load = useCallback(() => {
    api.adm('overview').then(setO);
    api.adm('players?sort=last_seen').then(r => Array.isArray(r) && setLive(r.filter(p => p.online && !p.is_admin)));
  }, []);
  useEffect(() => { load(); const id = setInterval(load, 15000); return () => clearInterval(id); }, [load]);
  if (!o) return <div className="ad-muted">Lade…</div>;
  if (o.error) return <div className="ad-err">{o.error}</div>;
  return (
    <>
      <div className="ad-stats">
        <Stat icon="🟢" label="Gerade online (5 min)" value={o.online} accent="var(--green)" />
        <Stat icon="📅" label="Aktiv in 24 h" value={o.active24h} />
        <Stat icon="👥" label="Spieler gesamt" value={o.users} />
        <Stat icon="✨" label="Neu in 24 h" value={o.new24h} />
        <Stat icon="💬" label="Offenes Feedback" value={o.openFeedback} accent={o.openFeedback ? 'var(--gold)' : undefined} />
        <Stat icon="💰" label="Jackpot-Topf" value={fmtMoney(o.jackpot)} />
        <Stat icon="🎉" label="Jackpots geknackt" value={o.jackpotWins} />
        <Stat icon="⛔" label="Gesperrt" value={o.banned} />
        <Stat icon="🗄️" label="Datenbank" value={`${(o.dbBytes / 1024 / 1024).toFixed(1)} MB`} />
        <Stat icon="⏱️" label="Server läuft seit" value={fmtTime(o.uptimeSec)} />
      </div>
      <div className="mg-panel" style={{ marginTop: 16 }}>
        <div className="mg-label">🟢 Gerade online ({live.length}) · aktualisiert alle 15 s</div>
        {live.length === 0 && <div className="ad-muted">Gerade spielt niemand.</div>}
        {live.map(p => (
          <button key={p.id} className="ad-row" onClick={() => onOpen(p.id)}>
            <span className="dot on" /> <b>{p.username}</b>
            <span className="ad-muted">{LOCATIONS[p.location]?.icon} {LOCATIONS[p.location]?.name}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--green)' }}>{fmtMoney(p.earned)}</span>
          </button>
        ))}
      </div>
    </>
  );
}

// 3/4 Spielerliste mit Suche und Sortierung
function Players({ onOpen }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('last_seen');
  const [list, setList] = useState(null);
  useEffect(() => {
    const t = setTimeout(() => api.adm(`players?q=${encodeURIComponent(q)}&sort=${sort}`).then(setList), 250);
    return () => clearTimeout(t);
  }, [q, sort]);
  return (
    <div className="mg-panel">
      <div className="ad-toolbar">
        <input className="ad-input" placeholder="🔍 Spieler suchen…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="ad-input" value={sort} onChange={e => setSort(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="last_seen">Zuletzt online</option>
          <option value="created">Neueste zuerst</option>
          <option value="location">Fortschritt</option>
          <option value="earned">Verdient</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>
      {!list && <div className="ad-muted">Lade…</div>}
      {list && list.error && <div className="ad-err">{list.error}</div>}
      {Array.isArray(list) && (
        <div className="ad-table">
          <div className="ad-tr head"><span>Spieler</span><span>Ort</span><span>Verdient</span><span>Combo</span><span>Zuletzt online</span><span>Erstellt</span></div>
          {list.map(p => (
            <button key={p.id} className="ad-tr" onClick={() => onOpen(p.id)}>
              <span><i className={`dot${p.online ? ' on' : ''}`} /> <b>{p.username}</b>
                {p.is_admin ? <em className="ad-tag">Admin</em> : null}{p.banned && <em className="ad-tag red">gesperrt</em>}{p.lb_hidden && <em className="ad-tag">versteckt</em>}</span>
              <span>{LOCATIONS[p.location]?.icon} {LOCATIONS[p.location]?.name}</span>
              <span>{fmtMoney(p.earned)}</span>
              <span>×{fmt(p.max_combo, 0)}</span>
              <span>{ago(p.last_seen)}</span>
              <span>{date(p.created_at)}</span>
            </button>
          ))}
          {list.length === 0 && <div className="ad-muted">Keine Spieler gefunden.</div>}
        </div>
      )}
    </div>
  );
}

// 5–18 Spieler-Details mit allen Aktionen
function PlayerDetail({ id, onClose, onChanged }) {
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState('');
  const [pw, setPw] = useState('');
  const [name, setName] = useState('');
  const [money, setMoney] = useState('');
  const [jet, setJet] = useState('');
  const [loc, setLoc] = useState(0);
  const [vip, setVip] = useState('');
  const [json, setJson] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const load = useCallback(() => api.adm(`player/${id}`).then(r => { setD(r); if (r.user) { setName(r.user.username); setLoc(r.user.location || 0); } }), [id]);
  useEffect(() => { load(); }, [load]);
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };
  const run = async (promise, ok) => {
    const r = await promise;
    if (r && r.error) flash('❌ ' + r.error); else { flash('✅ ' + ok); load(); onChanged(); }
  };
  const act = (action, ok) => run(api.adm(`player/${id}/action`, 'POST', { action }), ok);
  if (!d) return <div className="ad-muted">Lade…</div>;
  if (d.error) return <div className="ad-err">{d.error}</div>;
  const u = d.user; const s = d.save;
  const st = (s && s.stats) || {};

  return (
    <div className="ad-detail">
      <div className="ad-detail-head">
        <button className="mg-btn-ghost" onClick={onClose}>← Zurück</button>
        <div className="disp" style={{ fontSize: 24 }}>{u.username}</div>
        {u.banned && <em className="ad-tag red">gesperrt</em>}
        <span className="ad-muted" style={{ marginLeft: 'auto' }}>ID {u.id} · erstellt {date(u.created_at)} · online {ago(u.last_seen)}</span>
      </div>
      {msg && <div className="ad-flash">{msg}</div>}

      <div className="ad-grid">
        <div className="mg-panel">
          <div className="mg-label">📋 Spielstand</div>
          {!s && <div className="ad-muted">Noch kein Spielstand gespeichert.</div>}
          {s && (
            <div className="ad-kv">
              <span>Geld</span><b>{fmtMoney(s.money || 0)}</b>
              <span>Ort</span><b>{LOCATIONS[s.location || 0]?.icon} {LOCATIONS[s.location || 0]?.name}</b>
              <span>Gesamt verdient</span><b>{fmtMoney(st.totalEarned || 0)}</b>
              <span>Jetons</span><b>{fmt(Math.floor(s.jetons || 0), 0)} 🟣</b>
              <span>VIP-Stufe</span><b>{s.vip || 0}</b>
              <span>Helfer</span><b>{fmt(Object.values(s.helpers || {}).reduce((a, b) => a + b, 0), 0)}</b>
              <span>Werkzeuge</span><b>{(s.tools || []).length}</b>
              <span>Erfolge</span><b>{(s.achievements || []).length}</b>
              <span>Album</span><b>{albumPieces(s)}/{ALBUM_TOTAL}</b>
              <span>Münzen aufgehoben</span><b>{fmt(st.finds || 0, 0)}</b>
              <span>Beste Combo</span><b>×{fmt(st.maxCombo || 0, 0)}</b>
              <span>Casino-Runden</span><b>{fmt(st.bets || 0, 0)}</b>
              <span>Casino-Bilanz</span><b>{fmtMoney(st.gambleProfit || 0)}</b>
              <span>Spielzeit</span><b>{fmtTime(st.playTime || 0)}</b>
              <span>Tutorial</span><b>Aufgabe {(s.quest || 0) + 1}</b>
              <span>Zuletzt gespeichert</span><b>{date(u.save_at)}</b>
            </div>
          )}
          {d.pending.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="mg-label">⏳ Wartet auf den Spieler ({d.pending.length})</div>
              {d.pending.map(p => (
                <div key={p.id} className="ad-row">
                  <code>{p.action.slice(0, 80)}</code>
                  <button className="ad-mini" onClick={() => run(api.adm(`action/${p.id}`, 'DELETE'), 'Aktion zurückgezogen')}>✕</button>
                </div>
              ))}
              <div className="ad-muted" style={{ fontSize: 12 }}>Änderungen am Spielstand werden angewendet, sobald der Spieler online ist (spätestens nach 20 s).</div>
            </div>
          )}
        </div>

        <div className="mg-panel">
          <div className="mg-label">🔑 Account</div>
          <div className="ad-action">
            <label>Neues Passwort</label>
            <div className="ad-line">
              <input className="ad-input" value={pw} onChange={e => setPw(e.target.value)} placeholder="Mindestens 4 Zeichen" />
              <button className="ad-mini" title="Zufallspasswort" onClick={() => setPw(randomPassword())}>🎲</button>
              <button className="mg-btn small" onClick={() => run(api.adm(`player/${id}/password`, 'POST', { password: pw }), `Passwort gesetzt: ${pw}`)}>Setzen</button>
            </div>
            <div className="ad-muted" style={{ fontSize: 12 }}>Das neue Passwort steht danach oben in der Meldung – schick es deinem Freund.</div>
          </div>
          <div className="ad-action">
            <label>Benutzername</label>
            <div className="ad-line">
              <input className="ad-input" value={name} onChange={e => setName(e.target.value)} />
              <button className="mg-btn small" onClick={() => run(api.adm(`player/${id}/username`, 'POST', { username: name }), 'Name geändert')}>Ändern</button>
            </div>
          </div>
          <div className="ad-flags">
            <button className={`ad-toggle${u.banned ? ' on red' : ''}`} onClick={() => run(api.adm(`player/${id}/flags`, 'POST', { banned: !u.banned }), u.banned ? 'Entsperrt' : 'Gesperrt')}>⛔ {u.banned ? 'Entsperren' : 'Sperren'}</button>
            <button className={`ad-toggle${u.lb_hidden ? ' on' : ''}`} onClick={() => run(api.adm(`player/${id}/flags`, 'POST', { lb_hidden: !u.lb_hidden }), u.lb_hidden ? 'Wieder in der Rangliste' : 'Aus der Rangliste ausgeblendet')}>👁️ {u.lb_hidden ? 'In Rangliste zeigen' : 'Aus Rangliste ausblenden'}</button>
            <button className={`ad-toggle${u.is_admin ? ' on' : ''}`} onClick={() => run(api.adm(`player/${id}/flags`, 'POST', { is_admin: !u.is_admin }), u.is_admin ? 'Admin-Rechte entfernt' : 'Ist jetzt Admin (nach neuem Login)')}>🛡️ {u.is_admin ? 'Admin-Rechte entfernen' : 'Zum Admin machen'}</button>
          </div>
        </div>

        <div className="mg-panel">
          <div className="mg-label">🎁 Spielstand ändern</div>
          <div className="ad-action">
            <label>Geld (€)</label>
            <div className="ad-line">
              <input className="ad-input" value={money} onChange={e => setMoney(e.target.value)} placeholder="z. B. 1000 oder 1e9" />
              <button className="mg-btn small green" onClick={() => act({ type: 'money', mode: 'add', amount: +money }, `+${money} € geschickt`)}>Geben</button>
              <button className="mg-btn small" onClick={() => act({ type: 'money', mode: 'set', amount: +money }, `Geld auf ${money} € gesetzt`)}>Setzen</button>
            </div>
          </div>
          <div className="ad-action">
            <label>Jetons</label>
            <div className="ad-line">
              <input className="ad-input" value={jet} onChange={e => setJet(e.target.value)} placeholder="z. B. 100" />
              <button className="mg-btn small green" onClick={() => act({ type: 'jetons', mode: 'add', amount: +jet }, `+${jet} Jetons geschickt`)}>Geben</button>
              <button className="mg-btn small" onClick={() => act({ type: 'jetons', mode: 'set', amount: +jet }, `Jetons auf ${jet} gesetzt`)}>Setzen</button>
            </div>
          </div>
          <div className="ad-action">
            <label>Ort</label>
            <div className="ad-line">
              <select className="ad-input" value={loc} onChange={e => setLoc(+e.target.value)}>
                {LOCATIONS.map((l, i) => <option key={l.id} value={i}>{l.icon} {l.name}</option>)}
              </select>
              <button className="mg-btn small" onClick={() => act({ type: 'location', value: loc }, `Ort gesetzt: ${LOCATIONS[loc].name}`)}>Setzen</button>
            </div>
          </div>
          <div className="ad-action">
            <label>VIP-Stufe</label>
            <div className="ad-line">
              <input className="ad-input" value={vip} onChange={e => setVip(e.target.value)} placeholder={`aktuell ${(s && s.vip) || 0}`} />
              <button className="mg-btn small" onClick={() => act({ type: 'vip', value: +vip }, `VIP-Stufe ${vip}`)}>Setzen</button>
            </div>
          </div>
          <div className="ad-action">
            <label>Persönliche Nachricht</label>
            <div className="ad-line">
              <input className="ad-input" id="ad-msg" placeholder="Erscheint beim Spieler im Spiel" />
              <button className="mg-btn small" onClick={() => { const el = document.getElementById('ad-msg'); act({ type: 'message', text: el.value.slice(0, 200) }, 'Nachricht geschickt'); el.value = ''; }}>Senden</button>
            </div>
          </div>
        </div>

        <div className="mg-panel">
          <div className="mg-label">🧾 Rohdaten & Gefahrenzone</div>
          <div className="ad-flags">
            <button className="ad-toggle" onClick={() => setJson(json === null ? JSON.stringify(s || {}, null, 2) : null)}>{json === null ? '🔍 Spielstand als JSON ansehen' : 'JSON schließen'}</button>
            <button className="ad-toggle" disabled={!s} onClick={() => {
              const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `spielstand-${u.username}.json`; a.click();
            }}>💾 Spielstand herunterladen</button>
          </div>
          {json !== null && (
            <>
              <textarea className="ad-input ad-json" value={json} onChange={e => setJson(e.target.value)} spellCheck={false} />
              <button className="mg-btn small" onClick={() => {
                let parsed; try { parsed = JSON.parse(json); } catch { return flash('❌ Ungültiges JSON'); }
                act({ type: 'replace', save: parsed }, 'Spielstand ersetzt');
              }}>✏️ Geänderten Spielstand übernehmen</button>
            </>
          )}
          <div className="ad-flags" style={{ marginTop: 12 }}>
            {confirm === 'reset'
              ? <><span className="ad-muted">Wirklich zurücksetzen?</span><button className="mg-btn small red" onClick={() => { setConfirm(null); act({ type: 'reset' }, 'Spielstand zurückgesetzt'); }}>Ja</button><button className="ad-toggle" onClick={() => setConfirm(null)}>Nein</button></>
              : <button className="ad-toggle danger" onClick={() => setConfirm('reset')}>♻️ Spielstand zurücksetzen</button>}
            {confirm === 'delete'
              ? <><span className="ad-muted">Account endgültig löschen?</span><button className="mg-btn small red" onClick={async () => { const r = await api.adm(`player/${id}`, 'DELETE'); if (!r.error) { onChanged(); onClose(); } else flash('❌ ' + r.error); }}>Löschen</button><button className="ad-toggle" onClick={() => setConfirm(null)}>Nein</button></>
              : <button className="ad-toggle danger" onClick={() => setConfirm('delete')}>🗑️ Account löschen</button>}
          </div>
        </div>
      </div>

      {d.feedback.length > 0 && (
        <div className="mg-panel" style={{ marginTop: 16 }}>
          <div className="mg-label">💬 Feedback von {u.username}</div>
          {d.feedback.map(f => <div key={f.id} className="ad-fb"><b>{'★'.repeat(f.rating)}</b> <em className="ad-tag">{f.category}</em> {f.message} <span className="ad-muted">· {date(f.created_at)}</span></div>)}
        </div>
      )}
    </div>
  );
}

// 19 Feedback
function FeedbackList() {
  const [list, setList] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const load = useCallback(() => api.adm('feedback').then(setList), []);
  useEffect(() => { load(); }, [load]);
  if (!list) return <div className="ad-muted">Lade…</div>;
  if (list.error) return <div className="ad-err">{list.error}</div>;
  const shown = list.filter(f => showDone || !f.done);
  return (
    <div className="mg-panel">
      <div className="ad-toolbar">
        <div className="mg-label" style={{ margin: 0 }}>💬 Feedback ({list.filter(f => !f.done).length} offen)</div>
        <label className="ad-muted" style={{ marginLeft: 'auto' }}><input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} /> Erledigte zeigen</label>
      </div>
      {shown.length === 0 && <div className="ad-muted">Kein offenes Feedback 🎉</div>}
      {shown.map(f => (
        <div key={f.id} className={`ad-fb${f.done ? ' done' : ''}`}>
          <div className="ad-fb-head">
            <b>{f.username}</b> <span style={{ color: 'var(--gold)' }}>{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</span>
            <em className={`ad-tag${f.category === 'absturz' ? ' red' : ''}`}>{f.category}</em> <span className="ad-muted">{date(f.created_at)}</span>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button className="ad-mini" title="Erledigt" onClick={() => api.adm(`feedback/${f.id}/done`, 'POST').then(load)}>{f.done ? '↩️' : '✅'}</button>
              <button className="ad-mini" title="Löschen" onClick={() => api.adm(`feedback/${f.id}`, 'DELETE').then(load)}>🗑️</button>
            </span>
          </div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{f.message}</div>
          {f.context && <div className="ad-muted" style={{ fontSize: 11, marginTop: 4 }}>{f.context}</div>}
        </div>
      ))}
    </div>
  );
}

// 20 Jackpot · 21 Ankündigung · 22 Geschenk an alle
function Tools() {
  const [jp, setJp] = useState(null);
  const [pool, setPool] = useState('');
  const [ann, setAnn] = useState('');
  const [giftType, setGiftType] = useState('income');
  const [giftAmount, setGiftAmount] = useState('30');
  const [giftNote, setGiftNote] = useState('');
  const [msg, setMsg] = useState('');
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };
  const load = useCallback(() => api.adm('jackpot').then(setJp), []);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="ad-grid">
      {msg && <div className="ad-flash" style={{ gridColumn: '1 / -1' }}>{msg}</div>}
      <div className="mg-panel">
        <div className="mg-label">📢 Ankündigung an alle</div>
        <div className="ad-muted" style={{ fontSize: 12, marginBottom: 8 }}>Erscheint als Banner oben im Spiel bei allen Spielern (bis sie es wegklicken).</div>
        <textarea className="ad-input" rows={3} value={ann} onChange={e => setAnn(e.target.value)} placeholder="z. B. Heute Abend Update – danke fürs Testen!" />
        <div className="ad-line" style={{ marginTop: 8 }}>
          <button className="mg-btn small" onClick={() => api.adm('announce', 'POST', { text: ann }).then(r => flash(r.error ? '❌ ' + r.error : '✅ Ankündigung veröffentlicht'))}>Veröffentlichen</button>
          <button className="ad-toggle" onClick={() => api.adm('announce', 'POST', { text: '' }).then(() => { setAnn(''); flash('✅ Ankündigung entfernt'); })}>Entfernen</button>
        </div>
      </div>
      <div className="mg-panel">
        <div className="mg-label">🎁 Geschenk an alle Spieler</div>
        <div className="ad-line">
          <select className="ad-input" value={giftType} onChange={e => setGiftType(e.target.value)}>
            <option value="income">Minuten Einkommen</option>
            <option value="jetons">Jetons</option>
          </select>
          <input className="ad-input" value={giftAmount} onChange={e => setGiftAmount(e.target.value)} style={{ maxWidth: 110 }} />
        </div>
        <input className="ad-input" style={{ marginTop: 8 }} value={giftNote} onChange={e => setGiftNote(e.target.value)} placeholder="Notiz, z. B. „Danke fürs Testen!“" />
        <button className="mg-btn small green" style={{ marginTop: 8 }} onClick={() => api.adm('gift-all', 'POST', { type: giftType, amount: +giftAmount, note: giftNote || undefined })
          .then(r => flash(r.error ? '❌ ' + r.error : `✅ Geschenk an ${r.count} Spieler verschickt`))}>Verschenken</button>
        <div className="ad-muted" style={{ fontSize: 12, marginTop: 6 }}>„Minuten Einkommen“ passt sich an den Fortschritt jedes Spielers an.</div>
      </div>
      <div className="mg-panel">
        <div className="mg-label">💰 Gemeinsamer Jackpot</div>
        {jp && !jp.error && <div className="disp" style={{ fontSize: 26, color: 'var(--gold)' }}>{fmtMoney(jp.pool)}</div>}
        <div className="ad-line" style={{ marginTop: 8 }}>
          <input className="ad-input" value={pool} onChange={e => setPool(e.target.value)} placeholder="Neuer Topf, z. B. 5000" />
          <button className="mg-btn small" onClick={() => api.adm('jackpot', 'POST', { pool: +pool }).then(r => { flash(r.error ? '❌ ' + r.error : '✅ Jackpot gesetzt'); load(); })}>Setzen</button>
        </div>
        {jp && jp.wins && jp.wins.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="mg-label">🎉 Letzte Gewinner</div>
            {jp.wins.slice(0, 10).map(w => <div key={w.id} className="ad-row"><b>{w.username}</b> <span className="ad-muted">{w.game} · {date(w.created_at)}</span><span style={{ marginLeft: 'auto', color: 'var(--gold)' }}>{fmtMoney(w.amount)}</span></div>)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard({ user, onPlay, onLogout }) {
  const [tab, setTab] = useState('overview');
  const [open, setOpen] = useState(null);
  const [tick, setTick] = useState(0);
  const go = (t) => { setOpen(null); setTab(t); };
  return (
    <div className="mg ad">
      <header className="mg-header">
        <div className="mg-logo"><span className="hat">🛠️</span><span className="word">Admin-Zentrale</span></div>
        <div className="ad-muted" style={{ marginLeft: 'auto' }}>{GAME_NAME} · angemeldet als <b>{user.username}</b></div>
        <button className="mg-btn small green" onClick={onPlay}>🎮 Spiel öffnen</button>
        <button className="mg-btn-ghost" onClick={onLogout}>Abmelden</button>
      </header>
      <nav className="mg-tabs">
        {[['overview', '📊 Übersicht'], ['players', '👥 Spieler'], ['feedback', '💬 Feedback'], ['tools', '🎁 Aktionen']].map(([id, l]) => (
          <button key={id} className={`mg-tab ${tab === id && !open ? 'active' : ''}`} onClick={() => go(id)}>{l}</button>
        ))}
      </nav>
      <main className="mg-main">
        {open
          ? <PlayerDetail key={open} id={open} onClose={() => setOpen(null)} onChanged={() => setTick(t => t + 1)} />
          : tab === 'overview' ? <Overview onOpen={setOpen} />
            : tab === 'players' ? <Players key={tick} onOpen={setOpen} />
              : tab === 'feedback' ? <FeedbackList /> : <Tools />}
      </main>
    </div>
  );
}
