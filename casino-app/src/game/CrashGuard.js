import React from 'react';
import { api } from '../api';

// Fängt Abstürze ab: statt grauem Bildschirm eine Meldung mit „Weiterspielen“.
// Der Fehler wird automatisch an den Server gemeldet (erscheint im Admin-Menü unter Feedback).
let lastReport = 0;
export const reportCrash = (error, extra = '') => {
  const msg = String((error && error.message) || error || '');
  // Netzwerkfehler (offline, Server schläft) sind keine Abstürze
  if (/Failed to fetch|NetworkError|Load failed|ResizeObserver|aborted/i.test(msg)) return;
  if (Date.now() - lastReport < 10000) return;
  lastReport = Date.now();
  try {
    api.reportCrash({
      message: String((error && error.message) || error).slice(0, 500),
      stack: String((error && error.stack) || '').slice(0, 2000),
      extra: String(extra).slice(0, 1500),
      url: window.location.href,
      ua: navigator.userAgent,
    }).catch(() => {});
  } catch {}
};

export default class CrashGuard extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, key: 0 };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportCrash(error, info && info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mg mg-center">
          <div style={{ fontSize: 64 }}>🙈</div>
          <h2 className="disp" style={{ fontSize: 28, margin: '10px 0 6px' }}>Ups – da ist was schiefgelaufen</h2>
          <p style={{ color: 'var(--muted)', maxWidth: 360, margin: '0 0 18px' }}>
            Dein Spielstand ist gesichert. Der Fehler wurde automatisch gemeldet, damit er behoben wird.
          </p>
          <button className="mg-btn green" onClick={() => this.setState(s => ({ error: null, key: s.key + 1 }))}>▶ Weiterspielen</button>
          <button className="mg-btn-ghost" style={{ marginTop: 12 }} onClick={() => window.location.reload()}>Seite neu laden</button>
          <div style={{ color: 'var(--dim)', fontSize: 11, marginTop: 16, maxWidth: 360, wordBreak: 'break-word' }}>{String(this.state.error.message || this.state.error)}</div>
        </div>
      );
    }
    return <React.Fragment key={this.state.key}>{this.props.children}</React.Fragment>;
  }
}
