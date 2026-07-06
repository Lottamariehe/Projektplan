# Anleitung: Urlaubsverwaltung, Mehrfach-Einsatzzeiträume, Bauabschnitte, Sortierung, Konflikterkennung

Diese Anleitung ergänzt `SETUP-ANLEITUNG.md`, `ERWEITERUNGEN-ANLEITUNG.md` und `ERWEITERUNGEN-ANLEITUNG-2-PERSONALEINSATZPLANUNG.md`. Zeitaufwand zum Ausrollen: ca. 10 Minuten (nur Dateien hochladen, die Datenbank ist bereits fertig).

**Wichtiger Stand, bevor du loslegst:** Ich habe die Datenbank-Migration bereits direkt in deiner D1-Datenbank `projektplan` ausgeführt (`migration_003_urlaub_einsatzabschnitte_bauabschnitte.sql`). Kontrolliert danach:

- 18 Projekte, 38 Ausschreibungen, 22 Mitarbeiter, 6 Vergabeportale – alles unverändert erhalten.
- 25 bestehende Projekt-Mitarbeiter-Zuordnungen unverändert erhalten.
- 12 bisherige individuelle Mitarbeiter-Zeiträume wurden verlustfrei in die neue Tabelle `assignment_periods` übernommen.
- Die neuen Tabellen `project_phases` (Bauabschnitte) und `vacations` (Urlaub) sind angelegt und leer (du kannst direkt loslegen).

**Du musst also keine SQL-Befehle mehr selbst ausführen.** `schema.sql` und `migration_003_urlaub_einsatzabschnitte_bauabschnitte.sql` liegen trotzdem im Projektordner – als Referenz und falls du die App einmal auf einer zweiten, frischen Datenbank aufsetzen willst.

---

## Was ist neu?

### 1. Urlaubsplanung (neuer Menüpunkt)

Zwischen „Mitarbeiter" und „Einstellungen" gibt es jetzt **„Urlaubsplanung"**. Dort steht jeder Mitarbeiter mit einer Zeile: seine bereits eingetragenen Urlaubszeiträume als Chips (löschbar per Klick auf ×) und ein Eingabefeld direkt daneben, um einen neuen Zeitraum (KW/Jahr Start – KW/Jahr Ende, optional Bemerkung) hinzuzufügen. Kein Popup, keine Zwischenschritte.

Urlaub wirkt sich automatisch auf die Personaleinsatzplanung aus:

- Jeder Mitarbeiter mit Urlaub bekommt dort eine eigene, deutlich abgesetzte Urlaubs-Spur (grau/gelb, Strandkorb-Symbol 🏖 an seinem Namen).
- Überschneidet sich ein Urlaub mit einem laufenden Projekteinsatz, wird das betroffene Stück des Projektbalkens mit einem schraffierten Overlay markiert ("automatisch unterbrochen dargestellt") und beide Zeilen erscheinen im Konfliktbanner oben.
- Ein im Urlaub befindlicher Mitarbeiter gilt in diesem Zeitraum als nicht verfügbar – im Projekt-Formular erscheint bei der Mitarbeiterzuordnung ein Warnhinweis „⚠ Urlaub im Zeitraum", wenn eine Überschneidung besteht.

### 2. Beliebig viele Einsatzabschnitte je Mitarbeiter und Projekt

Im Projekt-Formular gibt es bei „Zugeordnete Mitarbeiter" jetzt statt einer einzelnen „eigener Zeitraum"-Checkbox einen Button **„+ Zeitraum"**. Jeder Klick fügt eine weitere Zeile (KW/Jahr Start – KW/Jahr Ende) hinzu, jede einzeln löschbar. Ohne eigene Zeiträume gilt weiterhin automatisch die gesamte Projektlaufzeit (keine Zusatzeingabe nötig).

In der Personaleinsatzplanung erscheint für jeden Einsatzabschnitt ein eigener, einzeln verschieb- und verlängerbarer Balken (Ziehen an Kanten/Mitte funktioniert wie gewohnt). Zwei Abschnitte desselben Projekts überschneiden sich absichtlich nie als „Konflikt" – das ist der Normalfall bei getrennten Einsätzen (z. B. KW 15–18 und erneut KW 22–26).

### 3. Bauabschnitte je Projekt

Im Projekt-Formular gibt es einen neuen Bereich „Bauabschnitte" mit „+ Bauabschnitt hinzufügen". Jeder Abschnitt hat eine optionale Bezeichnung sowie eigene Start-/End-KW. Ohne Bauabschnitte bleibt ein Projekt wie bisher ein durchgehender Balken.

Sobald mindestens ein Bauabschnitt hinterlegt ist:

- zeigt der Projektplaner für dieses Projekt mehrere getrennte Balken (einer je Bauabschnitt), jeder einzeln per Maus verschieb- und verlängerbar,
- wird die Kapazitätsleiste unter dem Projektplaner **nur** innerhalb der tatsächlichen Bauabschnitte gezählt (nicht in Bauunterbrechungen dazwischen).

### 4. Projektübersicht sortieren

Neues Sortierfeld in der Toolbar des Projektplaners: Alphabetisch, Projektbeginn, Projektende, Auftraggeber, Projektleiter, Obermonteur, Status. Die Wahl wird pro Gerät/Browser gemerkt (bleibt auch nach Neuladen erhalten).

### 5. Konflikterkennung

Automatisch erkannt und farblich hervorgehoben werden:

- **Doppelbelegung eines Mitarbeiters** (zwei verschiedene Projekte gleichzeitig) – wie bisher in der Personaleinsatzplanung, jetzt zusätzlich abschnittsgenau.
- **Urlaub kollidiert mit Projekteinsatz** – Overlay auf dem Balken + Konfliktbanner (siehe oben).
- **Zwei Projekte brauchen gleichzeitig denselben Obermonteur** – im Projektplaner wird das betroffene Projekt rot umrandet, ein Warnsymbol erscheint am Projektnamen, und ein Hinweisbanner oberhalb des Plans listet die betroffenen Projektpaare. Bei Bauabschnitten wird abschnittsgenau geprüft.

### 6. Erweiterter Tooltip in der Personaleinsatzplanung

Beim Überfahren eines Balkens mit der Maus stehen jetzt zusätzlich Auftraggeber, Tags und die Dauer in Kalenderwochen mit im Tooltip (bisher: Projektname, Zeitraum, Projektleiter, Obermonteur, Status, Konflikte).

## Was noch bewusst nicht umgesetzt ist

- Das Verschieben eines einzelnen Urlaubsbalkens per Maus in der Personaleinsatzplanung ist nicht vorgesehen – Urlaub wird ausschließlich in der Urlaubsplanung gepflegt (ein Klick auf den Urlaubsbalken springt direkt zur passenden Zeile dorthin). Das hält die Personaleinsatzplanung übersichtlich und vermeidet Verwechslungen zwischen „Einsatzabschnitt verschieben" und „Urlaub verschieben".
- Es gibt noch keine feste Regel, wie viele Urlaubstage einem Mitarbeiter pro Jahr zustehen bzw. wie viele bereits verbraucht sind (reine Zeitraumverwaltung, kein Resturlaubs-Konto). Sag Bescheid, falls das als nächster Schritt sinnvoll wäre.
- Excel-Export/-Import berücksichtigt Urlaub, Bauabschnitte und Mehrfach-Einsatzabschnitte aktuell noch nicht (nur die bestehenden Projekt-/Ausschreibungs-/Personaleinsatz-Exporte). Lässt sich bei Bedarf ergänzen.

---

## Zur Datenstruktur (deine Zusatzfrage)

Du hattest gefragt, ob die bisherige Datenstruktur langfristig für professionelle Ressourcenplanung geeignet ist. Kurze Einordnung:

Die App war von Anfang an relational aufgebaut (eigene Tabellen für Projekte, Ausschreibungen, Mitarbeiter, Zuordnungen, Tags), aber Zeiträume steckten teils noch als Spalten direkt in Zuordnungstabellen (`project_employees.startYear` usw.), was jeweils nur **einen** Zeitraum pro Zuordnung zuließ. Mit dieser Erweiterung sind Zeiträume und Bauphasen jetzt in eigenen Tabellen ausgelagert:

- `assignment_periods` – beliebig viele Einsatzabschnitte je (Projekt, Mitarbeiter)
- `project_phases` – beliebig viele Bauabschnitte je Projekt
- `vacations` – beliebig viele Urlaubszeiträume je Mitarbeiter

Jede dieser Tabellen folgt demselben Muster: eigene ID, Bezug per Fremdschlüssel, eigener Zeitraum, eigene Zeitstempel. Zukünftige Erweiterungen wie Krankmeldungen, Fahrzeugplanung, Materialeinsätze oder Tagesplanung lassen sich nach demselben Muster als zusätzliche Tabelle ergänzen, ohne bestehende Tabellen oder Funktionen anzufassen (additive Migration wie bei `migration_003`). Die App bleibt damit ohne Umbau erweiterbar – das war schon vor dieser Änderung so angelegt und ist jetzt konsequent auf alle Zeitraum-Konzepte übertragen.

---

## Schritt 1: Geänderte/neue Dateien ins GitHub-Repository hochladen

**Einfachster Weg:** kompletten Projektordner erneut hochladen (GitHub-Weboberfläche → „Add file" → „Upload files" → Dateien reinziehen → „Commit changes"). Cloudflare Pages baut danach automatisch neu (1–2 Minuten, unter **Workers & Pages → dein Projekt → Deployments** prüfbar).

**Neu hinzugekommen:**
- `functions/api/vacations/index.js`
- `functions/api/vacations/[id].js`
- `js/urlaub.js`
- `migration_003_urlaub_einsatzabschnitte_bauabschnitte.sql` (Referenz, bereits live ausgeführt)

**Geändert:**
- `functions/api/bootstrap.js`
- `functions/api/admin/reset.js`
- `functions/api/employees/[id].js`
- `functions/api/projects/index.js`
- `functions/api/projects/[id].js`
- `index.html`
- `style.css`
- `js/api.js`
- `js/state.js`
- `js/storage.js`
- `js/modals.js`
- `js/gantt.js`
- `js/capacity.js`
- `js/personal.js`
- `js/main.js`
- `schema.sql` (nur relevant für künftige Neuinstallationen)

**Unverändert** (nicht neu hochladen nötig): `js/util.js`, `js/employees.js`, `js/ausschreibungen.js`, `js/export.js`, `js/importwizard.js`, `functions/api/_utils.js`, `functions/api/settings.js`, `functions/api/health.js`, `functions/api/import.js`, `functions/api/employees/index.js`, `functions/api/employees/reorder.js`, `functions/api/portals/*`, `functions/api/tenders/*`, `functions/api/admin/config.js`, `wrangler.toml`.

## Schritt 2: Cloudflare-Einstellungen

Keine Änderung nötig. Es kommen keine neuen Bindings, Umgebungsvariablen oder Berechtigungen hinzu – `functions/api/vacations/*` nutzt dieselbe `DB`-Bindung wie alle anderen Endpunkte (siehe `wrangler.toml`, unverändert). Cloudflare Access/Admin-Rechte bleiben wie bisher konfiguriert.

## Schritt 3: Testen

1. **Urlaubsplanung**: Menüpunkt sollte zwischen „Mitarbeiter" und „Einstellungen" erscheinen, alle 22 Mitarbeiter als Zeile. Bei einem Mitarbeiter einen Urlaub eintragen (z. B. aktuelle KW bis +2), Toast-Meldung sollte erscheinen, Chip sollte sofort auftauchen.
2. In der **Personaleinsatzplanung** sollte dieser Mitarbeiter jetzt eine zusätzliche graue Urlaubs-Spur mit Strandkorb-Symbol 🏖 zeigen. Trägst du testweise einen Urlaub ein, der sich mit einem laufenden Projekteinsatz überschneidet, sollte der Projektbalken ein schraffiertes Overlay bekommen und das Konfliktbanner oben erscheinen.
3. **Mehrfach-Einsatzabschnitte**: Projekt öffnen → bei einem zugeordneten Mitarbeiter „+ Zeitraum" zweimal klicken, zwei unterschiedliche KW-Bereiche eintragen, speichern. In der Personaleinsatzplanung sollten für diesen Mitarbeiter zwei getrennte Balken für dasselbe Projekt erscheinen (kein Konfliktsymbol, da derselbe Projekt).
4. **Bauabschnitte**: Bei einem Projekt „+ Bauabschnitt hinzufügen" zweimal klicken, zwei nicht überlappende KW-Bereiche eintragen, speichern. Im Projektplaner sollten jetzt zwei getrennte Balken für dieses eine Projekt erscheinen; in der Kapazitätsleiste darunter sollte die Lücke zwischen den Abschnitten nicht mitgezählt werden.
5. **Sortierung**: Im Projektplaner das neue Sortierfeld auf „Auftraggeber" stellen, Seite neu laden – Auswahl sollte erhalten bleiben.
6. **Obermonteur-Konflikt**: Zwei Projekte mit demselben Obermonteur auf überlappende Zeiträume legen (testweise) → beide sollten rot umrandet sein, Warnbanner oberhalb des Plans sollte erscheinen. Danach wieder rückgängig machen.
7. **Tooltip**: Balken in der Personaleinsatzplanung mit der Maus überfahren → Auftraggeber, Tags und Dauer sollten mit im Tooltip stehen.

## Falls etwas nicht funktioniert

| Problem | Wahrscheinliche Ursache |
|---|---|
| Menüpunkt „Urlaubsplanung" fehlt | `index.html` oder `js/urlaub.js` nicht mit hochgeladen, oder Skript-Reihenfolge in `index.html` verändert (`js/urlaub.js` muss nach `js/employees.js` und vor `js/personal.js` stehen) |
| Urlaub lässt sich nicht speichern | `functions/api/vacations/index.js` bzw. `[id].js` fehlt, oder Deployment der Functions ist fehlgeschlagen (Cloudflare-Dashboard → Deployments → Fehler prüfen) |
| Urlaub wird nicht in der Personaleinsatzplanung angezeigt | `js/personal.js` oder `js/state.js` nicht aktualisiert, oder Browser-Cache (Strg+F5) |
| „+ Zeitraum" / „+ Bauabschnitt" reagiert nicht | `js/modals.js` nicht mit hochgeladen |
| Bauabschnitte werden im Projektplaner nicht als getrennte Balken angezeigt | `js/gantt.js` nicht mit hochgeladen |
| Sortierung bleibt nach Neuladen nicht erhalten | Browser blockiert lokalen Speicher (z. B. strikter Privat-/Inkognito-Modus) – ansonsten unproblematisch |
| Bestehende Mitarbeiter-Zeiträume aus früheren Projekten sind weg | Sollte nicht vorkommen (wurden automatisch in `assignment_periods` übernommen) – bitte melden, falls doch, dann direkt in der D1-Datenbank prüfbar über `SELECT * FROM assignment_periods;` |
