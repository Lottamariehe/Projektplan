# Anleitung: Projektart, überarbeitete Konflikterkennung, Bauabschnitte in der Personaleinsatzplanung

Diese Anleitung ergänzt `SETUP-ANLEITUNG.md` sowie die bisherigen `ERWEITERUNGEN-ANLEITUNG*.md`-Dateien. Zeitaufwand zum Ausrollen: ca. 10 Minuten (nur Dateien hochladen, die Datenbank ist bereits fertig).

**Wichtiger Stand, bevor du loslegst:** Ich habe die Datenbank-Migration bereits direkt in deiner D1-Datenbank `projektplan` ausgeführt (`migration_004_projektarten.sql`). Kontrolliert danach:

- 20 Projekte unverändert erhalten (nur die neue Spalte `projektart` wurde ergänzt, `NULL`/leer bei allen bestehenden Projekten – kein Datenverlust).
- Die neue Spalte `projects.projektart` sowie der zugehörige Index sind angelegt.
- Es wurde bewusst **keine** neue Tabelle angelegt – die Liste der verfügbaren Projektarten (Name + Farbe) lebt, genau wie Projektleiter/Obermonteure/Farbpalette, im bestehenden `settings`-Datensatz.

**Du musst also keine SQL-Befehle mehr selbst ausführen.** `schema.sql` und `migration_004_projektarten.sql` liegen trotzdem im Projektordner – als Referenz und falls du die App einmal auf einer zweiten, frischen Datenbank aufsetzen willst.

---

## Was ist neu?

### 1. Projektart je Projekt

Im Projekt-Formular gibt es jetzt neben „Status" ein neues Feld **„Projektart"** (Einzelauswahl, unabhängig von den Tags). Mitgeliefert werden fünf Standard-Projektarten mit Standardfarbe:

| Projektart | Standardfarbe |
|---|---|
| Großprojekt | hellblau |
| Kleines Projekt | hellrot |
| Heizungserneuerung | hellrot |
| Wärmepumpe | hellrot |
| Badezimmer | hellrosa |

Die gewählte Projektart färbt **ausschließlich die Namenszelle** des Projekts in der Seitenleiste des Projektplaners ein – die Balkenfarbe (`Farbe` im Formular, frei wählbar) bleibt davon komplett unberührt und funktioniert wie bisher. Die Projektart lässt sich in der Toolbar filtern (neues Dropdown „Alle Projektarten") und im Sortierfeld als zusätzliche Option „Projektart" auswählen.

Die Liste der Projektarten (Name + Farbe) verwaltest du in **Einstellungen → Projektarten**: neue Art hinzufügen (Name + Farbwähler), Farbe bestehender Arten per Klick auf den Farbkreis ändern, Art per × entfernen. Bereits vergebene Projektarten an Projekten bleiben beim Löschen aus der Liste als reiner Text erhalten (nur die Farbeinfärbung entfällt dann).

### 2. Neue Tags

Die Tag-Liste (rein beschreibend, ohne Farbwirkung) wurde um „Heizungserneuerung" und „Kleines Projekt" ergänzt – zusätzlich zur (unabhängigen) Projektart gleichen Namens, falls du beides parallel nutzen möchtest.

### 3. Überarbeitete Konflikterkennung: Mehrere Projekte pro Person sind jetzt ausdrücklich erlaubt

Bisher wurde jede Überschneidung zweier Projekte mit demselben Obermonteur automatisch als Konflikt markiert. Das war im Alltag zu aggressiv – ein Obermonteur betreut normalerweise mehrere kleinere Baustellen gleichzeitig. Das ist jetzt geändert:

- **Standardmäßig gibt es dafür gar keine Prüfung mehr.** Ein Projektleiter oder Obermonteur kann beliebig viele Projekte gleichzeitig betreuen, ohne dass irgendwo eine Warnung erscheint.
- **Optional** kannst du in **Einstellungen → Kapazitätsgrenzen je Person** für einzelne Projektleiter oder Obermonteure ein Limit hinterlegen ("max. X gleichzeitige Projekte"). Nur wenn ein solches Limit explizit gesetzt UND überschritten ist, erscheint der bekannte Warnhinweis (rote Umrandung, ⚠-Symbol am Projektnamen, Hinweisbanner über dem Projektplaner, Detail im Tooltip). Ohne hinterlegtes Limit bleibt die Person unbegrenzt einsetzbar.
- Es gibt bewusst **keine** separate „Mitarbeiter-Kapazität überschritten"-Prüfung (z. B. auf Basis von Wochenstunden) – das war eine der drei ursprünglich angefragten Konfliktarten, die auf deinen Wunsch hin nicht umgesetzt wurde.

Unverändert bleiben die beiden anderen Konfliktarten aus der letzten Erweiterung: Doppelbelegung eines Mitarbeiters über mehrere Projekte hinweg und Urlaub-kollidiert-mit-Projekteinsatz (beide weiterhin in der Personaleinsatzplanung sichtbar).

### 4. Gantt-Balken zeigen jetzt Projektleiter/Obermonteur direkt an

Jeder Projektbalken im Projektplaner zeigt jetzt zusätzlich zum Projektnamen eine kleinere zweite Zeile mit „PL <Name>" und „OM <Name>" (sofern hinterlegt) – ohne dass man erst den Tooltip öffnen muss. Der vollständige Tooltip (inkl. Auftraggeber, Status, Zeitraum, Tags, Mitarbeiter, Projektart, Konflikte) bleibt beim Überfahren mit der Maus wie gewohnt verfügbar.

### 5. Personaleinsatzplanung folgt jetzt automatisch den Bauabschnitten

Bisher galt ein Mitarbeiter ohne eigenen Einsatzzeitraum automatisch für die **gesamte** Projektlaufzeit als eingeplant – auch wenn das Projekt Bauabschnitte mit Lücken dazwischen hatte. Das ist jetzt korrigiert: Hat ein Projekt Bauabschnitte und der Mitarbeiter keinen eigenen Zeitraum hinterlegt, erscheint in der Personaleinsatzplanung automatisch **ein Balken je Bauabschnitt** (keine durchgehende Linie über Bauunterbrechungen hinweg). Das passiert ohne Zutun – reine Ableitung aus den vorhandenen Bauabschnitts-Daten, keine zusätzliche Eingabe nötig.

Ziehst du einen dieser automatisch aus den Bauabschnitten abgeleiteten Balken in der Personaleinsatzplanung mit der Maus, wird daraus ein eigener Einsatzabschnitt – die übrigen Bauabschnitte des Mitarbeiters bleiben dabei automatisch als eigene Abschnitte erhalten (gehen also nicht verloren).

Im Projekt-Formular weist ein Hinweistext bei der Mitarbeiterzuordnung jetzt darauf hin, wenn ein Mitarbeiter ohne eigenen Zeitraum den Bauabschnitten folgt („folgt automatisch den X Bauabschnitten des Projekts").

## Was noch bewusst nicht umgesetzt ist

- Kein automatischer Kapazitäts-/Stundenabgleich je Mitarbeiter (siehe Punkt 3) – auf deinen ausdrücklichen Wunsch hin weggelassen.
- Die optionalen Kapazitätsgrenzen je Projektleiter/Obermonteur sind reine Zahlenwerte (max. Anzahl gleichzeitiger Projekte), keine Gewichtung nach Projektgröße oder Aufwand.
- Excel-Export/-Import berücksichtigt Projektart und Kapazitätsgrenzen aktuell noch nicht. Lässt sich bei Bedarf ergänzen.

---

## Geänderte / neue Dateien

**Neu:**
- `migration_004_projektarten.sql` – additive Migration (bereits live ausgeführt).

**Geändert:**
- `schema.sql` – `projektart`-Spalte + Index (für zukünftige Neuinstallationen).
- `functions/api/projects/index.js`, `functions/api/projects/[id].js` – `projektart` wird beim Anlegen/Bearbeiten mitgespeichert.
- `js/storage.js` – `DEFAULT_PROJEKTARTEN`, erweiterte `PROJECT_TAGS`, `defaultSettings()` um `projektarten`/`projektleiterLimits`/`obermonteurLimits` ergänzt, neuer Sortiermodus „Projektart".
- `js/state.js` – `computePersonCapacityConflicts()` ersetzt die alte automatische Obermonteur-Prüfung; Projektart-Filter/-Sortierung; `getEmployeeAssignmentPeriods()` folgt jetzt Bauabschnitten, wenn kein eigener Zeitraum hinterlegt ist.
- `js/modals.js` – Projektart-Auswahl im Projekt-Formular; Hinweistext bei der Mitarbeiterzuordnung ist jetzt bauabschnitts-bewusst.
- `js/gantt.js` – Namenszelle wird nach Projektart eingefärbt, Balken zeigen PL/OM, neuer Projektart-Filter, Konflikt-Banner/-Tooltip auf die neue Limit-Logik umgestellt.
- `js/personal.js` – Tooltip-Text und Drag-Logik berücksichtigen automatisch aus Bauabschnitten abgeleitete Einsatzabschnitte.
- `js/main.js` – Toolbar-Filter „Projektart", neue Einstellungen-Karten „Projektarten" und „Kapazitätsgrenzen je Person".
- `index.html` – neues Filter-Dropdown, zwei neue Einstellungen-Karten.
- `style.css` – Farbklassen für die Projektart-Namenszelle, zweizeiliges Balken-Label, Styling der neuen Einstellungen-Karten.

## Bereitstellung (Cloudflare Pages)

Die Datenbank-Migration ist bereits erledigt – du musst nur die geänderten/neuen Dateien hochladen:

1. Alle oben aufgeführten Dateien in dein Cloudflare-Pages-Projekt hochladen (Git-Push oder manueller Upload, je nachdem wie du bisher deployt hast).
2. Cloudflare Pages baut automatisch neu – keine weiteren Einstellungen, Umgebungsvariablen oder Bindings nötig (die `DB`-Bindung existiert bereits).
3. Seite neu laden (ggf. Hard-Reload, damit die neuen `.js`-Dateien nicht aus dem Browser-Cache kommen).

## Testschritte

1. **Projektart:** Ein bestehendes Projekt öffnen → Projektart auswählen (z. B. „Wärmepumpe") → Speichern. Im Projektplaner sollte die Namenszelle jetzt hellrot hinterlegt sein, die Balkenfarbe unverändert.
2. **Projektart-Verwaltung:** Einstellungen → Projektarten → neue Art „Sanitärsanierung" mit eigener Farbe hinzufügen → im Projekt-Formular eines anderen Projekts auswählbar prüfen.
3. **Filter/Sortierung:** Im Projektplaner das Dropdown „Alle Projektarten" auf eine bestimmte Art setzen → nur passende Projekte sichtbar. Sortierung auf „Projektart" umstellen → Projekte alphabetisch nach Projektart gruppiert.
4. **Konflikterkennung (Standard = kein Konflikt):** Zwei Projekte mit überlappendem Zeitraum und demselben Obermonteur anlegen/bearbeiten → es sollte **kein** Warnhinweis mehr erscheinen (das war vorher ein automatischer Konflikt).
5. **Konflikterkennung (mit Limit):** Einstellungen → Kapazitätsgrenzen je Person → für den in Schritt 4 verwendeten Obermonteur ein Limit von 1 setzen → Projektplaner neu laden → jetzt sollte der Konflikthinweis (rote Umrandung, Banner, Tooltip) erscheinen. Limit wieder entfernen → Hinweis verschwindet wieder.
6. **Bar-Label:** Im Projektplaner prüfen, dass Projektleiter/Obermonteur als zweite Zeile auf dem Balken erscheinen (sofern im Projekt hinterlegt).
7. **Bauabschnitte in der Personaleinsatzplanung:** Ein Projekt mit zwei Bauabschnitten (mit Lücke dazwischen) und einem zugeordneten Mitarbeiter ohne eigenen Zeitraum öffnen → in der Personaleinsatzplanung sollten für diesen Mitarbeiter zwei getrennte Balken erscheinen (nicht ein durchgehender). Einen der Balken verschieben → prüfen, dass der andere Bauabschnitt als eigener Balken erhalten bleibt.

---

## Zur Datenstruktur (Ergänzung)

Die Projektart wurde bewusst **nicht** als eigene Tabelle angelegt, sondern als einzelne Spalte (`projects.projektart`, freier Text) plus einer frei editierbaren Liste im bestehenden `settings`-Datensatz – genau wie schon Projektleiter, Obermonteure und die Farbpalette. Das hält das Schema schlank: Eine Projektart ist eine reine Eigenschaft eines Projekts, kein eigenständiges, verknüpftes Objekt mit eigenem Lebenszyklus. Die optionalen Kapazitätsgrenzen je Person folgen demselben Muster (`settings.projektleiterLimits` / `settings.obermonteurLimits`, je ein einfaches Name→Zahl-Objekt).

Das bereits bestehende Muster aus der letzten Erweiterung (eigene Tabellen für alles, das einen eigenen Zeitraum und Lebenszyklus hat: `assignment_periods`, `project_phases`, `vacations`) bleibt davon unberührt und ist weiterhin der richtige Ansatz für zukünftige Erweiterungen wie Krankmeldungen oder Materialeinsätze.
