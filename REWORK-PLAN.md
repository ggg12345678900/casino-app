# Casino-Mogul – Plan für das große Update

Ziel: In wenigen großen Schritten umsetzen, jeweils testen und danach **einmal** veröffentlichen.

## Schritt 1 – Kleine Fehler (≈ 5 min)
- [ ] **Euro-Münzen richtig herum** (`src/game/game.css`, `.mg-coin.bimetal` / `.bimetal2`)
  - 1 € = silberner Kern + goldener Ring
  - 2 € = goldener Kern + silberner Ring
  - (Im Moment ist es vertauscht.)

## Schritt 2 – Handy-Layout neu (Hauptarbeit)
Problem: Auf dem Handy liegt alles untereinander. Die Reiter scrollen seitlich, der Shop liegt unter dem Spielfeld, der Kopf ist voll.

Neues Layout für Breiten unter 760px (am PC ändert sich nichts):
- [ ] **Kopfzeile kompakt**: Logo nur 🎩, groß in der Mitte das Geld und darunter klein $/s. Ton, Feedback und Logout wandern in ein ⚙️-Menü. (`GameApp.js`, `game.css`)
- [ ] **Untere Navigationsleiste wie in Apps**: 5 Symbole, fest am unteren Rand: 🪙 Sammeln · 🛒 Shop · 🎰 Casino · 🗺️ Orte · ☰ Mehr (Erfolge, Rangliste, Statistik). Mit Rücksicht auf die iPhone-Leiste unten (safe-area). (`GameApp.js`)
- [ ] **Shop als eigener Reiter**: Auf dem Handy nicht mehr unter dem Spielfeld, sondern ein eigener Tab. Darauf zeigt ein roter Zähler, wie viele Käufe gerade möglich sind. (`GameApp.js`, `Shop.js`)
- [ ] **Sammeln-Bildschirm ohne Scrollen**: Das Spielfeld füllt den Bildschirm, Quest und Ziel stehen als schmale Leiste darüber. (`SearchView.js`, `game.css`)
- [ ] **Shop-Einträge kompakter**: eine Zeile mit Symbol, Name, Anzahl und Preis. Details stehen klein darunter. (`Shop.js`, `game.css`)
- [ ] **Casino-Lobby als 2er-Raster mit Kacheln**, ein Spiel öffnet im Vollbild mit ✕ oben links (`Views.js`, `game.css`)
- [ ] **Slots auf dem Handy**: Walzen oben, Einsatz und DREHEN-Knopf groß unten im Daumenbereich (`Slots.js`, `game.css`)
- [ ] **Toasts und Live-Feed** über der Navigationsleiste, maximal eine Zeile (`game.css`)
- [ ] **Tutorial-Markierungen** (`mg-hl`) zusätzlich an das Symbol in der Leiste unten hängen (`GameApp.js`)

## Schritt 3 – Test und Veröffentlichung
- [ ] Playwright: iPhone SE (kleinstes Gerät), iPhone 13, Android und Desktop. Screenshots an dich zur Abnahme.
- [ ] Lint, Build, PR, Merge, dann online

---

## Später: Handy-App & Steam (eigene Phase, erst nach dem Rework)
Eine Codebasis für alles, keine zwei Spiele bauen.

| | Handy-App (iOS/Android) | Steam (PC) |
|---|---|---|
| Verpackung | Capacitor (Web-Spiel in App-Hülle) | Electron oder Tauri (Web-Spiel als .exe) |
| Kosten | Apple 99 $/Jahr, Google 25 $ einmalig | Steam Direct 100 $ pro Spiel |
| Login | Eigener Account oder Game Center / Play Games | Automatisch über Steam-Account |
| Spielstand | Server (wie jetzt) | Steam Cloud oder Server |
| Erfolge | optional Game Center / Play Games | Steam-Achievements (Steamworks) |
| Layout | Handy-Layout aus Schritt 2 | Desktop-Layout (gibt es schon) |
| Altersfreigabe | „Simuliertes Glücksspiel“: 17+ (Apple) bzw. 18 (Google, je nach Land) | Kennzeichnung „simuliertes Glücksspiel“ |

**Wichtig (rechtlich):**
- Spielgeld darf **nie** für echtes Geld kaufbar oder auszahlbar sein, sonst gilt es als Glücksspiel.
- Einnahmen deshalb über einen festen Kaufpreis, Werbung oder kosmetische Dinge, nicht über Spielgeld-Pakete.
- Der Server muss dann dauerhaft laufen. Render kostet dafür etwa 7 $/Monat, weil der Gratis-Server einschläft.
- Ein Impressum und eine Datenschutzerklärung werden nötig.

---

## Marketing (Shorts / Reels / TikTok)
**Phase A – direkt nach dem Handy-Rework (gratis):**
- [ ] Gameplay-Clips im Hochformat 9:16 automatisch aufnehmen (Playwright-Video auf Handy-Größe): Münzregen, Combo 500, Jackpot, Feuerwerk, Orts-Aufstieg
- [ ] Untertitel und Hook einbrennen (z. B. „Von 1 Cent zum Casino-Mogul 🎩“, „Combo 1000 möglich?“)
- [ ] Link in der Bio: die Web-Version, sofort spielbar und gratis
- [ ] Rhythmus: 1 Clip pro Tag auf allen drei Plattformen, nach 2 Wochen auswerten

**Phase B – Steam-Seite „Demnächst erhältlich“:**
- [ ] Steamworks-Account mit 100 $ Gebühr, Identitäts- und Steuerprüfung (wenige Tage)
- [ ] Shop-Grafiken (Kapsel-Bilder in mehreren Größen), mindestens 5 Screenshots, Trailer, Beschreibung
- [ ] Valve prüft die Seite (2–5 Werktage). Danach sammelt man Wunschlisten-Einträge.
- [ ] Regeln: Die Seite muss mindestens 2 Wochen vor Release sichtbar sein. Release frühestens 30 Tage nach der Gebühr.
- [ ] Emojis als Grafik ersetzen (Apple-Emojis dürfen nicht verkauft werden): eigene Sprites oder Twemoji/Noto mit freier Lizenz
