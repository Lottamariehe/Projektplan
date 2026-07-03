# Anleitung: Erweiterungen einbauen (Mitarbeiter, Tags, Logo, Admin-Rechte, Ausschreibungs-Spalten, Import-Assistent)

Diese Anleitung ergänzt die bestehende `SETUP-ANLEITUNG.md`. Sie beschreibt, wie du die neuen Funktionen live schaltest. Zeitaufwand: ca. 15–20 Minuten.

**Wichtiger Stand, bevor du loslegst:** Ich habe deine D1-Datenbank `projektplan` bereits direkt bearbeitet (Zugriff bestand über die Cloudflare-Verbindung dieser Sitzung). Das bedeutet:

- Alle neuen Tabellen (Mitarbeiter, Vergabeportale, Tags, Gewerke, Admin-Konfiguration) sind bereits angelegt.
- Deine Excel-Datei ist bereits vollständig importiert: **17 Projekte, 39 Ausschreibungen, 22 Mitarbeiter, 6 Vergabeportale**.
- Ich habe dabei die bisherigen Test-/Beispieldaten entfernt, die in der Datenbank lagen (6 automatische Beispielprojekte/-ausschreibungen sowie die beiden Testeinträge „TU CC Sanitär" und „Test Projekt Jan"), wie in deiner Anweisung gewünscht („keine Testdaten").
- Drei Admin-E-Mail-Adressen sind bereits eingetragen: `adm.heise@heise-haustechnik.de`, `lotta_heise@live.de`, `l.heise@heise-haustechnik.de`.

**Du musst also keine SQL-Befehle mehr selbst ausführen.** Was noch fehlt, ist ausschließlich der Code (Schritt 1–3 unten). `schema.sql` und `migration_001_erweiterungen.sql` liegen trotzdem im Projektordner – als Referenz und falls du die App irgendwann auf einer zweiten, frischen Datenbank aufsetzen willst.

---

## Schritt 1: Geänderte/neue Dateien ins GitHub-Repository hochladen

**Einfachster Weg:** Lade den kompletten Inhalt dieses Projektordners erneut hoch und überschreibe damit die bestehenden Dateien in deinem GitHub-Repository (GitHub-Weboberfläche → "Add file" → "Upload files" → Dateien reinziehen → "Commit changes"). Die Ordnerstruktur muss erhalten bleiben.

Falls du lieber gezielt nur die geänderten Dateien hochladen möchtest, hier die vollständige Liste:

**Neu hinzugekommen:**
- `functions/api/admin/config.js`
- `functions/api/admin/reset.js`
- `functions/api/employees/index.js`
- `functions/api/employees/[id].js`
- `functions/api/portals/index.js`
- `functions/api/portals/[id].js`
- `functions/api/import.js`
- `js/employees.js`
- `js/importwizard.js`
- `public/logo-hier-ablegen.md` (nur Hinweistext, keine Pflichtdatei)
- `migration_001_erweiterungen.sql` (Referenz für andere Umgebungen)

**Geändert:**
- `functions/api/_utils.js`
- `functions/api/bootstrap.js`
- `functions/api/projects/index.js`
- `functions/api/projects/[id].js`
- `functions/api/tenders/index.js`
- `functions/api/tenders/[id].js`
- `index.html`
- `style.css`
- `js/api.js`
- `js/state.js`
- `js/storage.js`
- `js/modals.js`
- `js/gantt.js`
- `js/ausschreibungen.js`
- `js/main.js`
- `js/export.js`
- `schema.sql` (nur relevant für künftige Neuinstallationen)

**Unverändert** (nicht neu hochladen nötig): `js/util.js`, `js/capacity.js`, `functions/api/settings.js`, `functions/api/health.js`, `wrangler.toml`.

Nach dem Hochladen baut Cloudflare Pages automatisch neu (dauert 1–2 Minuten). Das kannst du unter **Workers & Pages → dein Projekt → Deployments** verfolgen.

---

## Schritt 2: Firmenlogo einfügen (optional)

Die Anwendung sucht das Logo automatisch unter `public/logo.png`. Sobald du eine Logo-Datei hast:

1. Datei in `logo.png` umbenennen (PNG mit transparentem Hintergrund empfohlen, ca. 80–120 Pixel Höhe reicht).
2. In den Ordner `public/` legen (im GitHub-Repository unter `public/logo.png`).
3. Hochladen – Cloudflare Pages baut automatisch neu.
4. Seite neu laden: Logo erscheint links im Kopfbereich.

Ohne Logo-Datei blendet sich die Fläche automatisch unsichtbar aus – kein kaputtes Bild, kein Problem. Details stehen auch in `public/logo-hier-ablegen.md`.

---

## Schritt 3: Admin-E-Mail-Adressen prüfen/ändern

Die drei oben genannten Adressen sind bereits eingetragen. Wenn du sie ändern möchtest, brauchst du **keine Datei zu bearbeiten** – das geht direkt in der App:

1. Mit einer der drei Admin-Adressen anmelden (Cloudflare Access prüft das automatisch).
2. **Einstellungen** öffnen → Kachel **„Administratoren"** ist jetzt sichtbar (nur für Admins).
3. Adresse hinzufügen über das Eingabefeld, vorhandene über das „×" neben der Adresse entfernen.
4. Es muss immer mindestens eine Admin-Adresse übrig bleiben – die App verhindert, dass du dich versehentlich aussperrst.

Nutzer, deren E-Mail-Adresse nicht in dieser Liste steht, sehen die Kachel „Administratoren" gar nicht und die Buttons „Alle Projekte & Ausschreibungen löschen" / „Datenbank vollständig zurücksetzen" sind für sie ausgegraut. Zusätzlich prüft der Server bei jedem endgültigen Löschen (Projekt, Ausschreibung, Mitarbeiter, Vergabeportal) erneut, ob die anfragende Person wirklich Admin ist – das lässt sich also nicht durch Bearbeiten der Seite im Browser umgehen.

---

## Schritt 4: Erneut deployen

Wenn du in Schritt 1 bereits alle Dateien hochgeladen hast, ist dieser Schritt automatisch erledigt (Cloudflare Pages baut bei jedem GitHub-Upload neu). Falls du sichergehen willst:

1. Cloudflare-Dashboard → **Workers & Pages** → dein Projekt.
2. Im Reiter **Deployments** prüfen, ob ein neuer Build mit Status "Success" erschienen ist.
3. Falls nicht: **Retry deployment** klicken.

---

## Schritt 5: Testen, ob alles funktioniert

Gehe die folgende Liste durch (am besten im Inkognito-Fenster, damit du sicher die neue Version siehst):

1. **Grundfunktion:** `https://<deine-domain>/api/health` aufrufen → sollte `{"ok":true,...}` zeigen.
2. **Projekte & Ausschreibungen:** Im Projektplaner sollten jetzt 17 Projekte, in den Ausschreibungen 39 Einträge erscheinen (keine Beispieldaten wie "Heizungssanierung Familie Krause" mehr).
3. **Mitarbeiter:** Neuer Menüpunkt "Mitarbeiter" oben → 22 Mitarbeiter sollten aufgelistet sein. Ändere testweise eine Funktion/Rolle direkt in der Tabelle – sollte sofort gespeichert werden ("Speichert…" oben rechts).
4. **Tags:** Ein Projekt öffnen (Klick auf den Balken oder die Zeile links) → Bereich "Tags" sollte auswählbar sein. Im Projektplaner links oben gibt es jetzt einen Tag-Filter.
5. **Mitarbeiter-Zuordnung:** Im selben Projekt-Formular sollten unter "Zugeordnete Mitarbeiter" Checkboxen mit den 22 Namen erscheinen. Mit der Maus über einen Projektbalken im Gantt fahren → Tooltip zeigt zugeordnete Mitarbeiter und Tags.
6. **Ausschreibungen-Spalten:** In der Ausschreibungsübersicht sollten jetzt die Spalten "Portal", "Gewerke" und "Countdown" zu sehen sein, inkl. Filter nach Gewerk und Sortierung nach Countdown (Spaltenkopf anklicken).
7. **Admin-Rechte:** Mit deiner Admin-Adresse angemeldet → oben rechts steht "Angemeldet als … · Administrator". In Einstellungen sind "Alle Projekte & Ausschreibungen löschen" und "Datenbank vollständig zurücksetzen" anklickbar, die Kachel "Administratoren" ist sichtbar. Mit einer Nicht-Admin-Adresse (oder wenn du das testen willst: trage testweise eine vierte E-Mail ein, mit der du dich NICHT anmeldest) sollten diese Buttons ausgegraut sein.
8. **Logo:** Falls in Schritt 2 eingebaut, erscheint es links oben.
9. **Import-Assistent:** Einstellungen → "Import-Assistent öffnen" → deine Excel-Datei erneut auswählen → Vorschau sollte Projekte/Ausschreibungen/Mitarbeiter/Vergabeportale korrekt erkennen und als "aktualisieren" (nicht "neu") anzeigen, da die Datensätze bereits vorhanden sind.

---

## Was du inhaltlich noch prüfen solltest

Die Excel-Datei enthielt nicht für jeden Bereich vollständige Angaben. Ich habe automatisch sinnvolle Standardwerte gesetzt, aber bitte einmal drüberschauen:

- **Projekte** (Blatt „laufende Projekte"): Enthielt nur Projektnamen, keine Zeiträume, keinen Auftraggeber. Ich habe allen 17 Projekten testweise "aktuelle Woche + 4 Wochen" als Zeitraum gegeben, Status "In Ausführung", 2 Mitarbeitende Besetzung. Bitte im Projektplaner die echten Zeiträume per Drag-and-drop oder im Formular korrigieren – die Bemerkung "Aus Excel importiert – … bitte noch ergänzen" markiert das in jedem Datensatz.
- **Ausschreibungen ohne Datum:** Wo weder Anfangs- noch Enddatum in der Excel-Datei standen, habe ich einen Platzhalter-Zeitraum (Submission + 60 bis 150 Tage, sonst ab heute) eingetragen – bitte bei Bedarf im Gantt korrigieren.
- **Mitarbeiter-Sammelposten:** Einträge wie „Ritmo Team", „2 x Ukrainer" oder „2x Lüftungsbauer Team" aus deiner Excel-Liste wurden als einzelne Mitarbeiter-Datensätze mit Hinweis „Sammelposten/Team" übernommen, da es keine Einzelnamen gab. Bei Bedarf in der Mitarbeiterverwaltung in echte Einzelpersonen aufteilen.
- **Vergabeportal „Cosuno":** Kam in einer Ausschreibung vor, stand aber nicht auf deinem Blatt „Vergabeportale" – wurde automatisch als neues Portal angelegt (ohne Adresse/Hinweis).
- **Zugangsdaten der Vergabeportale** (Benutzername/Passwort) wurden bewusst **nicht** importiert – wie in unserer Absprache. Portale enthalten nur Name, Internetadresse und einen Hinweistext zur Abgabeart.

---

## Falls etwas nicht funktioniert

| Problem | Wahrscheinliche Ursache |
|---|---|
| Mitarbeiter-Menüpunkt fehlt / Seite sieht aus wie vorher | `index.html`, `style.css` oder `js/main.js` wurden nicht mit hochgeladen, oder der Cloudflare-Pages-Build ist fehlgeschlagen (Deployments-Reiter prüfen) |
| "D1-Datenbank ist nicht gebunden" | Sollte unverändert funktionieren, da an der Bindung nichts geändert wurde – prüfe SETUP-ANLEITUNG.md Schritt 5.4 |
| Admin-Buttons bleiben für dich ausgegraut, obwohl du Admin sein solltest | Prüfe, mit welcher E-Mail-Adresse Cloudflare Access dich anmeldet (oben rechts sichtbar) – muss exakt einer der drei hinterlegten Adressen entsprechen |
| Import-Assistent erkennt ein Blatt nicht | Blattname oder Spaltenüberschriften weichen zu stark ab – Blatt umbenennen (sollte "Projekt", "Ausschreibung", "Mitarbeiter" oder "Portal" enthalten) oder Spaltenüberschriften an die Originaldatei angleichen |
| Neue Projekte/Ausschreibungen ohne Tags/Gewerke/Mitarbeiter sichtbar | Normal – das sind optionale Zusatzfelder, die beim Bearbeiten ergänzt werden können |
