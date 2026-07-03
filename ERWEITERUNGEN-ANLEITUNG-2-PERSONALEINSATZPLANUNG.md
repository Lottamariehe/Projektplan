# Anleitung: Personaleinsatzplanung einbauen

Diese Anleitung ergänzt `SETUP-ANLEITUNG.md` und `ERWEITERUNGEN-ANLEITUNG.md`. Sie beschreibt den neuen Menüpunkt **Personaleinsatzplanung**. Zeitaufwand: ca. 10 Minuten.

**Wichtiger Stand, bevor du loslegst:** Die Datenbank-Erweiterung (neue Spalten) habe ich bereits direkt in deiner D1-Datenbank `projektplan` ausgeführt. Alle 22 bestehenden Mitarbeiter und alle Projekt-Zuordnungen sind unverändert erhalten geblieben – es wurden nur neue, leere Spalten ergänzt. **Du musst dafür nichts tun.**

---

## Was ist neu?

Ein zusätzlicher Menüpunkt **„Personaleinsatzplanung"** neben „Ausschreibungen". Er zeigt dieselben Projekte wie der Projektplaner, aber aus Sicht der Mitarbeiter: eine Zeile pro Mitarbeiter, Balken für jedes zugeordnete Projekt.

Wichtig: Es werden **keine neuen Daten doppelt gespeichert**. Alles basiert auf den bestehenden Projekt-Mitarbeiter-Zuordnungen. Verschiebst du ein Projekt im Projektplaner, ändert sich automatisch auch die Personaleinsatzplanung – und umgekehrt.

Im Einzelnen:

- **Mitarbeiterzeilen** mit Name, Funktion, optional Team/Qualifikation/Std. pro Woche/Beschäftigungsart (über „Details anzeigen" einblendbar).
- **Sortierung**: alphabetisch, nach Funktion, nach Team, oder manuell per Drag-and-drop (Griff-Symbol ⠿ links am Zeilenanfang, nur im Sortiermodus „Manuell" aktiv).
- **Gleicher Zoom** wie im Projektplaner (Monat/Quartal/Halbjahr/Jahr) – beide Ansichten sind synchronisiert.
- **Stapelung**: Ist ein Mitarbeiter gleichzeitig in mehreren Projekten eingeplant, werden die Balken in seiner Zeile automatisch in mehreren Reihen übereinander dargestellt (nie überlappend).
- **Auslastungsanzeige** je Mitarbeiter: Anzahl Projekte + belegte Kalenderwochen.
- **Terminüberschneidungen**: Überschneiden sich zwei Projekte eines Mitarbeiters zeitlich, erscheint ein rotes Warnsymbol an der Zeile, die Balken werden rot umrandet, und ein Hinweisbanner oben listet alle betroffenen Mitarbeiter.
- **Filter**: Mitarbeiter, Funktion, Projekt, Projektleiter, Obermonteur, Tag, Status – sowie eine freie Textsuche.
- **Hervorhebung**: Klick auf einen Projektbalken hebt alle Zeilen/Balken dieses Projekts hervor (z. B. um zu sehen, wer noch daran beteiligt ist); Klick auf eine Mitarbeiterzeile hebt dessen eigene Balken hervor. Erneuter Klick hebt die Markierung wieder auf.
- **Bearbeiten**: Doppelklick auf einen Balken öffnet das gewohnte Projekt-Formular.
- **Individueller Zeitraum je Mitarbeiter**: Im Projekt-Formular kannst du jetzt bei jedem zugeordneten Mitarbeiter über die Checkbox „eigener Zeitraum" einen abweichenden Einsatzzeitraum *innerhalb* der Projektlaufzeit hinterlegen (z. B. Mitarbeiter A ist KW 10–20 dabei, Mitarbeiter B nur KW 12–16 von einem KW-10–20-Projekt). Ohne Häkchen ist ein Mitarbeiter automatisch während der gesamten Projektlaufzeit eingeplant – wie bisher.
- **Balken in der Personaleinsatzplanung verschieben/verlängern**: Das ändert **nicht** die Projektlaufzeit selbst (die bleibt für alle Mitarbeiter gemeinsam gültig), sondern hinterlegt bzw. passt gezielt den individuellen Zeitraum dieses einen Mitarbeiters an. Das Verschieben ist auf den bestehenden Projektzeitraum begrenzt.
- **Export**: „Export (Excel)" erzeugt eine echte `.xlsx`-Datei (Mitarbeiter, Projekt, Zeitraum, Konfliktstatus). „Drucken / PDF" nutzt wie gewohnt den Browser-Druckdialog.

## Was noch offen ist (bewusst nicht umgesetzt)

- Eine automatische Auslastung in **Prozent** (auf Basis der Stunden/Woche) ist vorbereitet (Feld „Std./Woche" je Mitarbeiter existiert bereits), aber noch nicht berechnet – dafür müsste erst definiert werden, wie Teilzeit/Urlaub/Krankheit korrekt eingerechnet werden sollen. Aktuell zeigt die Auslastung Projektanzahl + belegte Kalenderwochen.
- Die von dir vorgeschlagene Struktur mit drei eigenständigen „Leitständen" (Projektübersicht / Personaleinsatzplanung / Kapazitätsübersicht als gleichrangige Vollbild-Bereiche) habe ich noch nicht umgesetzt – die bestehende Kapazitätsleiste unter dem Projektplaner deckt das Wichtigste bereits ab. Sag Bescheid, falls du das als eigenständigen Bereich ausgebaut haben möchtest.

---

## Schritt 1: Dateien hochladen

**Neu hinzugekommen:**
- `functions/api/employees/reorder.js`
- `js/personal.js`
- `migration_002_personaleinsatzplanung.sql` (Referenz, bereits live ausgeführt)

**Geändert:**
- `functions/api/bootstrap.js`
- `functions/api/employees/index.js`
- `functions/api/employees/[id].js`
- `functions/api/projects/index.js`
- `functions/api/projects/[id].js`
- `functions/api/import.js`
- `index.html`
- `style.css`
- `js/api.js`
- `js/state.js`
- `js/storage.js`
- `js/modals.js`
- `js/employees.js`
- `js/export.js`
- `js/main.js`
- `schema.sql` (nur relevant für künftige Neuinstallationen)

Am einfachsten: kompletten Projektordner erneut ins GitHub-Repository hochladen (überschreibt automatisch nur die geänderten Dateien). Cloudflare Pages baut danach automatisch neu (1–2 Minuten, unter „Deployments" prüfbar).

## Schritt 2: Testen

1. Menüpunkt **„Personaleinsatzplanung"** sollte zwischen „Ausschreibungen" und „Mitarbeiter" erscheinen.
2. Jeder deiner 22 Mitarbeiter sollte als Zeile auftauchen; bei den 17 Projekten mit Mitarbeiterzuordnung sollten Balken sichtbar sein.
3. Ein Mitarbeiter, der in zwei sich zeitlich überschneidenden Projekten steckt, sollte zwei gestapelte Balken + rotes Warnsymbol zeigen (falls aktuell keiner betroffen ist, testweise bei zwei Projekten denselben Mitarbeiter mit überlappendem Zeitraum zuordnen, um es zu prüfen, danach wieder rückgängig machen).
4. Sortierung auf „Manuell" stellen und eine Mitarbeiterzeile per Ziehen an eine andere Position verschieben – Reihenfolge sollte nach Seite-neu-laden erhalten bleiben.
5. Im Projekt-Formular (Projektplaner → Projekt anklicken) sollte bei „Zugeordnete Mitarbeiter" jetzt pro Person eine Checkbox „eigener Zeitraum" mit vier Zahlenfeldern erscheinen, wenn aktiviert.
6. Auf einen Projektbalken in der Personaleinsatzplanung klicken → alle Zeilen mit diesem Projekt werden hervorgehoben, andere abgedunkelt. Nochmal klicken hebt es auf.
7. „Export (Excel)" klicken → Datei `personaleinsatzplanung.xlsx` sollte herunterladen und in Excel öffnen.

## Falls etwas nicht funktioniert

| Problem | Wahrscheinliche Ursache |
|---|---|
| Menüpunkt fehlt | `index.html` oder `js/main.js` nicht mit hochgeladen, oder Deployment fehlgeschlagen |
| Ansicht bleibt leer, obwohl Mitarbeiter existieren | `js/personal.js` fehlt oder Skript-Reihenfolge in `index.html` wurde verändert (muss nach `js/employees.js` und vor `js/modals.js` stehen) |
| Drag-and-drop-Sortierung speichert nicht | `functions/api/employees/reorder.js` fehlt oder Deployment der Functions ist fehlgeschlagen |
| Individueller Zeitraum lässt sich nicht setzen | `js/modals.js` und `functions/api/projects/index.js` / `[id].js` nicht mit hochgeladen |
