# Großes Update – Plan

Umsetzung in großen Schritten. Nach jedem Schritt Test mit Screenshots, veröffentlicht wird erst am Ende.

## 0 – Neuer Name (Entscheidung durch dich)
Der Name soll Casino und Incremental verbinden: klein anfangen, groß werden, zocken. Am besten Englisch, wegen Steam und TikTok.

Vorschläge:
- **Penny to Jackpot**
- **Coin Rush Casino**
- **Pocket Change Casino**
- **Idle Jackpot**
- **Spare Change Tycoon**
- **Cent to Casino**

Vor der Festlegung prüfen: Steam-Suche, App Stores, Markenregister (DPMA/EUIPO) und ob die Domain bzw. der Social-Handle frei ist.

Danach Name, Logo und Icon überall tauschen (`manifest.json`, `index.html`, `GameApp.js`, `Login.js`, Icons).

## 1 – Kleine Fehler
- [ ] **Euro-Münzen richtig herum** (`game.css` `.bimetal` / `.bimetal2`): 1 € = Silberkern mit Goldring, 2 € = Goldkern mit Silberring

## 2 – Ein „richtiges Game“: Rahmen
- [ ] **Startbildschirm / Hauptmenü**: Logo, „Spielen“, „Einstellungen“, „Rangliste“, „Credits“, Login und Account
- [ ] **Einstellungen**:
  - Ton und Musik getrennt per Regler
  - Vibration am Handy
  - Effekte reduzieren (Akku/Leistung)
  - Zahlenformat (1,2 Mio / 1.2M)
  - Sprache (DE/EN, Grundlage für Steam)
  - Account: Logout und Spielstand zurücksetzen
- [ ] **Pause-/Menü-Knopf** im Spiel (⚙️)
- [ ] **Hintergrundmusik** (lizenzfrei oder selbst erzeugt), getrennt von den Soundeffekten
- [ ] **Vibration** bei Münzen, Gewinnen und Jackpot (Handy)
- [ ] **Ladebildschirm** statt leerer Seite, wenn der Server aufwacht

## 3 – Sanfter Einstieg (nicht überfordern)
UI wird Schritt für Schritt freigeschaltet, gesteuert über das Tutorial:

| Phase | Sichtbar |
|---|---|
| Start | **nur das Münzfeld** und das Geld |
| nach Quest 1 | Werkzeuge im Shop |
| nach Quest 2 | Helfer |
| nach Quest 3 | Orte-Reiter |
| nach Quest 4 | Casino (erst nur der Automat, weitere Spiele je Ort) |
| später | Glücksrad, Erfolge, Rangliste, Statistik, VIP, Jackpot |

- [ ] **Echtes Spotlight-Tutorial** wie in Handy-Games:
  - Der ganze Bildschirm wird abgedunkelt bzw. ausgegraut.
  - **Nur das Ziel bleibt hell**, mit weißem, pulsierendem Rahmen und einem **animierten Pfeil 👇** darauf.
  - Daneben steht eine kurze Sprechblase mit Anweisung, z. B. „Tippe auf die Münze!“.
  - Klicks gehen nur auf das hervorgehobene Element, der Rest ist gesperrt, bis der Schritt erledigt ist.
  - Das Spotlight wandert mit, wenn sich das Ziel bewegt (Münzen) oder der Bildschirm scrollt bzw. die Größe ändert.
  - Ein „Überspringen“-Knopf ist klein in der Ecke.
  - Technik: eine eigene `Spotlight`-Komponente (Overlay mit Ausschnitt über `box-shadow`/SVG-Maske), die per `data-tut="…"`-Markierung das Ziel findet. Am Handy und am PC gleich.
- [ ] Ablauf der ersten Minuten:
  1. 3 Münzen antippen
  2. Belohnung abholen
  3. Shop öffnen
  4. erstes Werkzeug kaufen
  5. Helfer kaufen
  6. Orte zeigen
  7. Casino und den ersten Automaten zeigen
  Danach läuft das freie Spiel, und spätere Freischaltungen kommen nur noch mit einem kurzen Spotlight und „Neu!“.
- [ ] Bestehende Spieler bekommen alles sofort (kein Rückschritt)
- [ ] Dateien: `economy.js` (Freischalt-Stufen), `GameApp.js`, `SearchView.js`, `Shop.js`, `Views.js`

## 4 – Neues Tempo (Balancing)
Ziel: Der Anfang ist etwas zäher, der Fortschritt wird gegen Ende immer schneller. Kein Sprung in Millionen oder Milliarden zu früh.
- [ ] Zielkurve, grob:

  | Zeitpunkt | Kontostand |
  |---|---|
  | 10 min | ~100 $ |
  | 1 h | ~10 k |
  | 3 h | ~10 Mio |
  | danach | stärker beschleunigend bis zum Mond |

- [ ] Hebel:
  - Helfer-Startpreise und Kostenwachstum am Anfang höher
  - spätere Orte günstiger im Verhältnis zum Einkommen
  - stärkere Meilenstein-Boni spät im Spiel
- [ ] Mit Bot-Simulationen prüfen (wie bisher), Kurve als Grafik an dich
- [ ] Server-Schummelschutz an die neue Kurve anpassen (`server/index.js`)

## 5 – Handy-Layout (wie eine echte App)
Am PC bleibt alles gleich, nur unter 760px Breite ändert sich das Layout.
- [ ] Untere Navigationsleiste: 🪙 Sammeln · 🛒 Shop · 🎰 Casino · 🗺️ Orte · ☰ Mehr (mit iPhone-safe-area)
- [ ] Kompakte Kopfzeile: groß das Geld und $/s, daneben ⚙️
- [ ] Shop als eigener Reiter mit Zähler, kompakte Einträge in einer Zeile
- [ ] Münzfeld füllt den Bildschirm, kein Scrollen beim Sammeln
- [ ] Casino-Lobby als 2er-Kachelraster, Spiele im Vollbild mit ✕
- [ ] Toasts und Live-Feed über der Leiste, maximal eine Zeile

## 6 – Casino-Spiele am Handy genauso gut wie am PC
Jedes Spiel wird einzeln am Handy geprüft und angepasst. Bedienelemente kommen unten in den Daumenbereich, die Animation muss immer sichtbar sein.
- [ ] **Chicken**: Animation am Handy fehlt bzw. ist nicht sichtbar, sie soll laufen wie am PC
- [ ] Slots (alle 7), Dice, Mines, Plinko, Crash, Roulette, Blackjack, Pump: jeweils Animation, Größe und Knöpfe prüfen
- [ ] Einheitliche Leiste für Einsatz und Spielen unten in allen Spielen

## 7 – Test und Veröffentlichung
- [ ] Playwright: iPhone SE, iPhone 13, Android, Desktop. Kompletter Durchlauf vom Tutorial bis zum Casino.
- [ ] Screenshots an dich zur Abnahme
- [ ] Lint, Build, PR, Merge, dann online

---

## Danach: Marketing (Shorts / Reels / TikTok)
**Phase A – gratis, sofort nach dem Update:**
- [ ] Gameplay-Clips im Hochformat 9:16 automatisch aufnehmen: Münzregen, Combo 500, Jackpot, Feuerwerk, Orts-Aufstieg
- [ ] Untertitel und Hook einbrennen
- [ ] Link in der Bio zur Web-Version (sofort spielbar)
- [ ] 1 Clip pro Tag auf allen drei Plattformen, nach 2 Wochen auswerten

**Phase B – Steam-Seite „Demnächst erhältlich“:**
- [ ] Steamworks-Account mit 100 $ Gebühr, Identitäts- und Steuerprüfung (macht du)
- [ ] Kapsel-Grafiken, mindestens 5 Screenshots, Trailer, Beschreibung (mache ich)
- [ ] Prüfung durch Valve (2–5 Werktage), dann Wunschlisten sammeln
- [ ] Regeln: Die Seite ist mindestens 2 Wochen vor Release sichtbar, Release frühestens 30 Tage nach der Gebühr
- [ ] Emojis als Grafik ersetzen (Apple-Emojis nicht verkaufbar): Twemoji/Noto (freie Lizenz) oder eigene Sprites

## Danach: Handy-App & Steam
Eine Codebasis für alles.

| | Handy-App (iOS/Android) | Steam (PC) |
|---|---|---|
| Verpackung | Capacitor | Electron oder Tauri |
| Kosten | Apple 99 $/Jahr, Google 25 $ einmalig | 100 $ pro Spiel |
| Login | eigener Account | Steam-Account |
| Spielstand | Server | Steam Cloud oder Server |
| Erfolge | optional Game Center / Play Games | Steam-Achievements |
| Altersfreigabe | „simuliertes Glücksspiel“, 17+/18 | Kennzeichnung „simuliertes Glücksspiel“ |

**Rechtlich:**
- Spielgeld darf **nie** für echtes Geld kaufbar oder auszahlbar sein.
- Einnahmen über einen Kaufpreis, Werbung oder kosmetische Dinge.
- Der Server muss dauerhaft laufen (Render ca. 7 $/Monat).
- Ein Impressum und eine Datenschutzerklärung werden nötig.

## Bereits erledigt (Stand jetzt)
Münzen-Sammeln mit Combo, Werkzeuge nur für Klicks, Helfer, 7 Orte, 15 Casino-Spiele mit Themen-Automaten und Freispielen, echter gemeinsamer Jackpot, VIP-Einsatzlimit, Quest-Tutorial, Erfolge, Rangliste (Geld und Combo), Offline-Einnahmen 20 %, Feedback, Schummelschutz, Online-Version mit Neon und Render.
