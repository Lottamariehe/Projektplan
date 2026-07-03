# Setup-Anleitung: Baustellenplaner online mit M365-Anmeldung

Diese Anleitung richtet die App so ein, dass sie von überall im Browser erreichbar ist, sich mit dem Microsoft-Konto (Entra ID) anmeldet und als Kachel in SharePoint verlinkt werden kann.

Gewählte Architektur: **Cloudflare Pages** (Hosting + Functions + D1-Datenbank, kostenlos) + **Cloudflare Access** (Anmeldeschranke, verknüpft mit Entra ID) + **SharePoint-Kachel** (Link, öffnet neuen Tab).

Voraussetzungen, die du bereits hast: GitHub-Konto, Cloudflare-Konto, Admin-Zugriff auf Entra ID und Azure.

Zeitaufwand: ca. 45–60 Minuten, einmalig.

---

## Schritt 1: Code auf GitHub bringen

1. Auf github.com ein neues, privates Repository anlegen, z. B. `shk-baustellenplaner`.
2. Den kompletten Inhalt dieses Projektordners (alle Dateien, inkl. `functions/`, `schema.sql`, `wrangler.toml`) in dieses Repository hochladen. Am einfachsten über die GitHub-Weboberfläche ("Add file" → "Upload files") oder mit Git, falls installiert.
3. Wichtig: Die Ordnerstruktur muss erhalten bleiben. `index.html` und der Ordner `functions/` müssen auf derselben Ebene (im Wurzelverzeichnis des Repos) liegen.

---

## Schritt 2: Entra-App-Registrierung anlegen

Cloudflare Access braucht eine Entra-App-Registrierung, um sich als Anmeldeschranke vorzuschalten.

1. Azure-Portal öffnen → **Microsoft Entra ID** → **App-Registrierungen** → **Neue Registrierung**.
2. Name: z. B. `Baustellenplaner Cloudflare Access`.
3. Unterstützte Kontotypen: "Nur Konten in diesem Organisationsverzeichnis" (nur eure Firma).
4. Redirect-URI: Typ **Web**, Wert vorerst `https://<dein-teamname>.cloudflareaccess.com/cdn-cgi/access/callback` (den genauen Teamnamen legst du in Schritt 3 fest — diesen Wert trägst du nach Schritt 3 hier nach).
5. Nach dem Anlegen notieren: **Anwendungs-ID (Client-ID)** und **Verzeichnis-ID (Tenant-ID)**, beide auf der Übersichtsseite der App-Registrierung sichtbar.
6. Links **Zertifikate & Geheimnisse** → **Neuer geheimer Clientschlüssel** → Ablaufdatum wählen (z. B. 24 Monate) → **Wert** direkt kopieren und sicher notieren (wird nur einmal angezeigt).
7. Links **API-Berechtigungen** → prüfen, dass `openid`, `email`, `profile` als Microsoft-Graph-Berechtigungen vorhanden sind (Standard bei neuen Registrierungen, sonst über "Berechtigung hinzufügen" ergänzen).

---

## Schritt 3: Cloudflare Zero Trust (Access) einrichten

1. Im Cloudflare-Dashboard → **Zero Trust** öffnen. Beim ersten Aufruf einen Teamnamen vergeben (z. B. `deinefirma`) — das ergibt die Domain `deinefirma.cloudflareaccess.com`, die du in Schritt 2.4 als Redirect-URI brauchst. Falls du sie dort noch nicht eingetragen hattest, jetzt in der Entra-App-Registrierung unter **Authentifizierung** nachtragen.
2. **Einstellungen → Authentifizierung → Anmeldemethoden → Hinzufügen → Azure AD (Entra ID)**.
3. Dort eintragen: Client-ID, Client-Geheimnis und Verzeichnis-ID (Tenant-ID) aus Schritt 2.
4. Speichern und mit "Test" prüfen, dass die Anmeldung funktioniert.
5. **Zugriff → Anwendungen → Anwendung hinzufügen → Self-hosted**.
6. Name: `Baustellenplaner`. Domain: die spätere Cloudflare-Pages-Domain (z. B. `shk-baustellenplaner.pages.dev`) — trägst du final nach Schritt 4 ein, kannst aber jetzt schon `*.pages.dev`-Unterdomain vorbereiten und später korrigieren.
7. Bei den Richtlinien ("Policies"): Regel anlegen, z. B. "Firma" → Zulassen, wenn E-Mail-Domain endet auf `@deinefirma.de` (oder gezielt einzelne Personen per E-Mail). Als Anmeldemethode Azure AD auswählen.
8. Speichern. Ab jetzt verlangt Cloudflare Access für die gesamte Domain eine Anmeldung mit dem Microsoft-Konto, bevor die App überhaupt geladen wird.

---

## Schritt 4: Cloudflare Pages-Projekt anlegen

1. Cloudflare-Dashboard → **Workers & Pages → Erstellen → Pages → Mit Git verbinden**.
2. Das in Schritt 1 angelegte GitHub-Repository auswählen und Zugriff autorisieren.
3. Build-Einstellungen: **Framework-Preset: Keine (None)**, **Build-Befehl: leer lassen**, **Ausgabeverzeichnis: `/`** (Wurzelverzeichnis, da `wrangler.toml` bereits `pages_build_output_dir = "."` setzt).
4. Bereitstellen. Nach ein bis zwei Minuten ist die App unter einer Adresse wie `https://shk-baustellenplaner.pages.dev` erreichbar (allerdings noch ohne Datenbank — das folgt in Schritt 5).
5. Falls in Schritt 3.6 nur ein Platzhalter eingetragen war: jetzt in der Access-Anwendung die tatsächliche `.pages.dev`-Domain nachtragen.

---

## Schritt 5: D1-Datenbank anlegen und verbinden

1. Cloudflare-Dashboard → **Workers & Pages → D1 → Datenbank erstellen**. Name: `shk_baustellenplaner_db`.
2. Nach dem Anlegen die **Datenbank-ID** kopieren.
3. In der Datei `wrangler.toml` (im GitHub-Repo bearbeiten oder lokal ändern und neu hochladen) den Platzhalter `REPLACE_WITH_YOUR_D1_DATABASE_ID` durch diese ID ersetzen und die Änderung committen — Cloudflare Pages baut danach automatisch neu.
4. Zusätzlich im Pages-Projekt selbst die Bindung eintragen: **Pages-Projekt → Einstellungen → Functions → D1-Datenbankbindungen → Hinzufügen**. Variablenname: `DB`, Datenbank: `shk_baustellenplaner_db`.
5. Tabellen anlegen: Im Cloudflare-Dashboard bei der D1-Datenbank auf **Konsole** gehen und den Inhalt von `schema.sql` einfügen und ausführen (alternativ mit installiertem `wrangler`: `wrangler d1 execute shk_baustellenplaner_db --remote --file=./schema.sql`).
6. Pages-Projekt einmal erneut deployen (z. B. über "Retry deployment"), damit die D1-Bindung aktiv wird.

---

## Schritt 6: Prüfen, ob alles funktioniert

1. Die Pages-URL im Browser öffnen (in einem privaten/Inkognito-Fenster testen). Es sollte zuerst die Microsoft-Anmeldung erscheinen, danach lädt die App.
2. Oben rechts sollte "Angemeldet als ..." mit deiner E-Mail-Adresse erscheinen.
3. Ein Test-Projekt anlegen, Seite neu laden — das Projekt muss erhalten bleiben (Beweis, dass die Datenbank greift, nicht nur der lokale Zwischenspeicher).
4. Zur Kontrolle `https://<deine-domain>/api/health` aufrufen — sollte `{"ok":true,...}` zurückgeben.

---

## Schritt 7: Kachel in SharePoint einrichten

1. Auf der gewünschten SharePoint-Seite → **Bearbeiten** → Web-Part **"Schnelllinks"** oder **"Kachel/Link"** hinzufügen.
2. Adresse: die Cloudflare-Pages-URL (z. B. `https://shk-baustellenplaner.pages.dev`).
3. Anzeigeoption: **"Öffnet in neuem Tab/Fenster"** aktivieren (nicht als eingebettete Ansicht — Microsofts Anmeldeseite lässt sich aus Sicherheitsgründen nicht in einem Rahmen/iframe einbetten).
4. Titel/Symbol nach Wunsch anpassen, z. B. "Baustellenplaner".
5. Seite veröffentlichen.

---

## Danach: Laufender Betrieb

- Jede Änderung, die du künftig am Code vornehmen möchtest (z. B. neue Funktionen), lädst du ins GitHub-Repository hoch — Cloudflare Pages baut automatisch neu.
- Neue Mitarbeiter erhalten Zugriff, indem du in Schritt 3.7 die Zugriffsregel erweiterst (z. B. weitere E-Mail-Adressen oder die ganze Firmendomain freigeben).
- Zugriffsentzug (z. B. bei Austritt) erfolgt zentral über Entra ID — sobald das Konto dort gesperrt ist, greift auch Cloudflare Access nicht mehr.
- Kosten: Cloudflare Pages, Functions und D1 sind im kostenlosen Plan für diese Nutzungsgröße ausreichend; Cloudflare Access ist bis 50 Nutzer kostenlos.

---

## Falls etwas nicht funktioniert

| Problem | Wahrscheinliche Ursache |
|---|---|
| Anmeldeseite erscheint nicht, App direkt sichtbar | Access-Anwendung deckt die Domain nicht vollständig ab (Schritt 3.6) |
| "D1-Datenbank ist nicht gebunden" | Bindung in Schritt 5.4 fehlt oder falscher Variablenname (muss exakt `DB` heißen) |
| Anmeldung klappt, aber Daten verschwinden nach Neuladen | `schema.sql` wurde nicht ausgeführt oder `database_id` in `wrangler.toml` falsch |
| "Angemeldet als" bleibt leer | Access-Anwendung schützt `/api/*` nicht mit — Domain-Zuordnung in Schritt 3.6 prüfen, ggf. Pfad `/*` statt nur Startseite |
| SharePoint-Kachel zeigt leere/weiße Seite | Kachel ist als Einbettung statt "neuer Tab" konfiguriert — Schritt 7.3 korrigieren |
