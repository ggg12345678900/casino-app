import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { reportCrash } from './game/CrashGuard';
import reportWebVitals from './reportWebVitals';

// Fehler außerhalb von React (z. B. in Timern) ebenfalls melden
window.addEventListener('error', (e) => reportCrash(e.error || e.message, 'window.onerror'));
window.addEventListener('unhandledrejection', (e) => reportCrash(e.reason || 'Promise abgelehnt', 'unhandledrejection'));

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
