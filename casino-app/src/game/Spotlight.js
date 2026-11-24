import React, { useEffect, useRef, useState } from 'react';

// Tutorial-Spotlight: dunkelt alles ab, nur das Ziel bleibt hell – mit Rahmen, Pfeil und Sprechblase.
// targets: [{ id, tip }] – das erste Element mit data-tut="id", das sichtbar ist, wird angezeigt.
// blocking: Klicks außerhalb des Ziels werden abgefangen.
const PAD = 8;

const findTarget = (targets) => {
  for (const t of targets) {
    const els = document.querySelectorAll(`[data-tut="${t.id}"]`);
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden') return { el, t };
    }
  }
  return null;
};

export default function Spotlight({ targets, blocking = true, onSkip, onSettings, onAdmin }) {
  const [view, setView] = useState(null); // { rect, tip, id }
  const [nudge, setNudge] = useState(0);
  const lastId = useRef(null);
  const key = targets.map(t => t.id).join('|');
  const targetsRef = useRef(targets);
  targetsRef.current = targets;

  useEffect(() => {
    let raf;
    let prev = '';
    const loop = () => {
      const hit = findTarget(targetsRef.current);
      if (!hit) {
        if (prev !== 'none') { prev = 'none'; setView(null); }
      } else {
        const r = hit.el.getBoundingClientRect();
        if (lastId.current !== hit.t.id) {
          lastId.current = hit.t.id;
          // Ziel ins Bild holen, falls es außerhalb liegt
          if (r.top < 60 || r.bottom > window.innerHeight - 70) hit.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        const sig = `${hit.t.id}:${Math.round(r.left)}:${Math.round(r.top)}:${Math.round(r.width)}:${Math.round(r.height)}:${window.innerWidth}`;
        if (sig !== prev) {
          prev = sig;
          setView({ id: hit.t.id, tip: hit.t.tip, rect: { left: r.left - PAD, top: r.top - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 } });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [key]);

  if (!view) return null;
  const { rect } = view;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Großes Ziel (z. B. das Münzfeld): Pfeil und Blase in das Ziel hinein statt darüber
  const big = rect.height > vh * 0.45;
  const above = big || rect.top > 150;
  const cx = Math.min(vw - 30, Math.max(30, rect.left + rect.width / 2));
  const arrowTop = big ? rect.top + 14 : above ? rect.top - 58 : rect.top + rect.height + 6;
  const bubbleW = Math.min(300, vw - 24);
  const bubbleLeft = Math.min(vw - bubbleW - 12, Math.max(12, cx - bubbleW / 2));
  const bubbleStyle = big
    ? { top: rect.top + 70, left: bubbleLeft, width: bubbleW }
    : above
      ? { bottom: vh - arrowTop + 4, left: bubbleLeft, width: bubbleW }
      : { top: arrowTop + 54, left: bubbleLeft, width: bubbleW };
  const bump = () => setNudge(n => n + 1);
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;

  return (
    <div className="mg-spot" aria-live="polite">
      <div key={nudge} className={`mg-spot-hole${nudge ? ' nudge' : ''}`} style={rect} />
      {blocking && (
        <>
          <div className="mg-spot-block" style={{ left: 0, top: 0, width: '100%', height: Math.max(0, rect.top) }} onPointerDown={bump} />
          <div className="mg-spot-block" style={{ left: 0, top: bottom, width: '100%', bottom: 0 }} onPointerDown={bump} />
          <div className="mg-spot-block" style={{ left: 0, top: rect.top, width: Math.max(0, rect.left), height: rect.height }} onPointerDown={bump} />
          <div className="mg-spot-block" style={{ left: right, top: rect.top, right: 0, height: rect.height }} onPointerDown={bump} />
        </>
      )}
      <div className={`mg-spot-arrow${above && !big ? '' : big ? ' inside' : ' up'}`} style={{ left: cx - 24, top: arrowTop }}>{above && !big ? '👇' : big ? '👇' : '👆'}</div>
      <div className="mg-spot-bubble" style={bubbleStyle}>{view.tip}</div>
      {onSkip && <button className="mg-spot-skip" onClick={onSkip}>Tutorial überspringen</button>}
      {onSettings && <button className="mg-spot-gear" onClick={onSettings} aria-label="Einstellungen">⚙️</button>}
      {onAdmin && <button className="mg-spot-gear admin" onClick={onAdmin} aria-label="Zur Admin-Zentrale">🛠️</button>}
    </div>
  );
}
