-- =========================================================
-- schema.sql – D1-Datenbankschema für den Baustellenplaner
-- Für NEUINSTALLATIONEN (leere Datenbank). Für bereits
-- bestehende Datenbanken bitte migration_001_erweiterungen.sql
-- verwenden, damit keine vorhandenen Daten verloren gehen.
--
-- Anwenden mit:
--   wrangler d1 execute <DB-NAME> --remote --file=./schema.sql
-- oder über die Cloudflare-Dashboard-Konsole der D1-Datenbank
-- (siehe SETUP-ANLEITUNG.md bzw. ERWEITERUNGEN-ANLEITUNG.md).
-- =========================================================

-- ---------------------------------------------------------
-- Projekte
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  auftraggeber  TEXT,
  adresse       TEXT,
  startYear     INTEGER NOT NULL,
  startWeek     INTEGER NOT NULL,
  endYear       INTEGER NOT NULL,
  endWeek       INTEGER NOT NULL,
  projektleiter TEXT,
  obermonteur   TEXT,
  besetzung     INTEGER DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'Geplant',
  farbe         TEXT,
  projektart    TEXT,
  bemerkungen   TEXT,
  notizen       TEXT,
  createdAt     TEXT,
  updatedAt     TEXT
);

-- ---------------------------------------------------------
-- Ausschreibungen (inkl. Vergabeportal-Referenz)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenders (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  auftraggeber       TEXT,
  ansprechpartner    TEXT,
  adresse            TEXT,
  submissionDatum    TEXT,
  submissionUhrzeit  TEXT,
  startYear          INTEGER NOT NULL,
  startWeek          INTEGER NOT NULL,
  endYear            INTEGER NOT NULL,
  endWeek            INTEGER NOT NULL,
  angebotsstatus     TEXT NOT NULL DEFAULT 'In Bearbeitung',
  auftragswert       REAL,
  zustaendigIntern   TEXT,
  bearbeitungsfrist  TEXT,
  bemerkungen        TEXT,
  unterlagenLink     TEXT,
  linkedProjectId    TEXT,
  portalId           TEXT,
  createdAt          TEXT,
  updatedAt          TEXT
);

-- ---------------------------------------------------------
-- Einstellungen (Projektleiter-/Obermonteur-Liste, Kapazitäts-
-- grenzen, Farbpalette) als ein JSON-Blob in genau einer Zeile
-- (id = 1). Enthält KEINE Admin-E-Mail-Adressen (siehe admin_config).
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id   INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL
);

-- ---------------------------------------------------------
-- Baustellenmitarbeiter (Stammdaten)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id                    TEXT PRIMARY KEY,
  vorname               TEXT NOT NULL DEFAULT '',
  nachname              TEXT NOT NULL DEFAULT '',
  funktion              TEXT,
  team                  TEXT,
  qualifikation         TEXT,
  wochenarbeitszeit     REAL,
  beschaeftigungsstatus TEXT,
  sortOrder             INTEGER NOT NULL DEFAULT 0,
  aktiv                 INTEGER NOT NULL DEFAULT 1,
  bemerkungen           TEXT,
  createdAt             TEXT,
  updatedAt             TEXT
);

-- Zuordnung Projekt <-> Mitarbeiter (Mehrfachauswahl in beide Richtungen).
-- Diese Tabelle beantwortet nur die Frage "ist Mitarbeiter X grundsätzlich
-- diesem Projekt zugeordnet?". Die eigentlichen Einsatzzeiträume (einer oder
-- mehrere je Mitarbeiter) stehen in assignment_periods (s. u.), damit ein
-- Mitarbeiter beliebig viele getrennte Einsatzabschnitte je Projekt haben
-- kann. Die Altspalten startYear/startWeek/endYear/endWeek sind seit der
-- Erweiterung um Mehrfach-Einsatzzeiträume NICHT mehr die Datenquelle
-- (siehe migration_003_urlaub_einsatzabschnitte_bauabschnitte.sql) und
-- bleiben nur aus Kompatibilitätsgründen erhalten (werden von der App nicht
-- mehr gelesen). Hat ein Mitarbeiter KEINE Zeilen in assignment_periods für
-- dieses Projekt, gilt er automatisch für die gesamte Projektlaufzeit als
-- eingeplant (Standardfall, keine Zusatzeingabe nötig).
CREATE TABLE IF NOT EXISTS project_employees (
  projectId  TEXT NOT NULL,
  employeeId TEXT NOT NULL,
  startYear  INTEGER,
  startWeek  INTEGER,
  endYear    INTEGER,
  endWeek    INTEGER,
  PRIMARY KEY (projectId, employeeId)
);

-- ---------------------------------------------------------
-- Einsatzabschnitte: beliebig viele Zeiträume je Mitarbeiter
-- UND Projekt (z. B. Mitarbeiter arbeitet KW15-18 und erneut
-- KW22-26 auf demselben Projekt). Jede Zeile ist ein einzelner,
-- eigenständig bearbeit- und verschiebbarer Balken in der
-- Personaleinsatzplanung.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignment_periods (
  id         TEXT PRIMARY KEY,
  projectId  TEXT NOT NULL,
  employeeId TEXT NOT NULL,
  startYear  INTEGER NOT NULL,
  startWeek  INTEGER NOT NULL,
  endYear    INTEGER NOT NULL,
  endWeek    INTEGER NOT NULL,
  createdAt  TEXT,
  updatedAt  TEXT
);

-- ---------------------------------------------------------
-- Bauabschnitte: beliebig viele getrennte Zeiträume je Projekt
-- (z. B. Bauunterbrechung). Ein Projekt OHNE Bauabschnitte wird
-- weiterhin als ein einziger Balken über projects.startYear ...
-- endWeek dargestellt (Standardfall, keine Zusatzeingabe nötig).
-- Sobald Bauabschnitte hinterlegt sind, ersetzen sie die
-- Darstellung im Projektplaner (mehrere Balken) UND die
-- Kapazitätsberechnung erfolgt dann nur innerhalb dieser
-- Zeiträume.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_phases (
  id        TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  name      TEXT,
  startYear INTEGER NOT NULL,
  startWeek INTEGER NOT NULL,
  endYear   INTEGER NOT NULL,
  endWeek   INTEGER NOT NULL,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT,
  updatedAt TEXT
);

-- ---------------------------------------------------------
-- Urlaub je Mitarbeiter. Wirkt sich automatisch auf die
-- Personaleinsatzplanung aus (Mitarbeiter gilt im Zeitraum als
-- nicht verfügbar, Projekteinsätze werden für die Anzeige um
-- den Urlaubszeitraum unterbrochen) - berechnet zur Laufzeit
-- aus assignment_periods + vacations, es werden dafür KEINE
-- zusätzlichen/abgeleiteten Zeilen gespeichert.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS vacations (
  id         TEXT PRIMARY KEY,
  employeeId TEXT NOT NULL,
  startYear  INTEGER NOT NULL,
  startWeek  INTEGER NOT NULL,
  endYear    INTEGER NOT NULL,
  endWeek    INTEGER NOT NULL,
  bemerkung  TEXT,
  createdAt  TEXT,
  updatedAt  TEXT
);

-- ---------------------------------------------------------
-- Projekt-Tags (zusätzlich zur Projektfarbe, Mehrfachauswahl)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_tags (
  projectId TEXT NOT NULL,
  tag       TEXT NOT NULL,
  PRIMARY KEY (projectId, tag)
);

-- ---------------------------------------------------------
-- Gewerke je Ausschreibung (Mehrfachauswahl)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS tender_gewerke (
  tenderId TEXT NOT NULL,
  gewerk   TEXT NOT NULL,
  PRIMARY KEY (tenderId, gewerk)
);

-- ---------------------------------------------------------
-- Vergabeportale (Stammdaten, OHNE Zugangsdaten/Passwörter –
-- bewusst nicht in der App gespeichert, siehe ERWEITERUNGEN-ANLEITUNG.md)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS portals (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  url       TEXT,
  hinweis   TEXT,
  createdAt TEXT,
  updatedAt TEXT
);

-- ---------------------------------------------------------
-- Admin-Konfiguration: genau eine Zeile (id = 1) mit den
-- Admin-E-Mail-Adressen als JSON-Array. Getrennt von "settings",
-- damit normale Nutzer sie nicht über die allgemeine
-- Einstellungen-Speicherung verändern können (serverseitig
-- geprüft in functions/api/admin/config.js).
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_config (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  adminEmails TEXT NOT NULL
);

-- ---------------------------------------------------------
-- Indizes
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_projects_zeitraum ON projects (startYear, startWeek, endYear, endWeek);
CREATE INDEX IF NOT EXISTS idx_tenders_zeitraum ON tenders (startYear, startWeek, endYear, endWeek);
CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders (angebotsstatus);
CREATE INDEX IF NOT EXISTS idx_tenders_portal ON tenders (portalId);
CREATE INDEX IF NOT EXISTS idx_project_employees_employee ON project_employees (employeeId);
CREATE INDEX IF NOT EXISTS idx_project_employees_zeitraum ON project_employees (employeeId, startYear, startWeek, endYear, endWeek);
CREATE INDEX IF NOT EXISTS idx_project_tags_tag ON project_tags (tag);
CREATE INDEX IF NOT EXISTS idx_tender_gewerke_gewerk ON tender_gewerke (gewerk);
CREATE INDEX IF NOT EXISTS idx_employees_aktiv ON employees (aktiv);
CREATE INDEX IF NOT EXISTS idx_employees_sortorder ON employees (sortOrder);
CREATE INDEX IF NOT EXISTS idx_employees_team ON employees (team);
CREATE INDEX IF NOT EXISTS idx_assignment_periods_project ON assignment_periods (projectId);
CREATE INDEX IF NOT EXISTS idx_assignment_periods_employee ON assignment_periods (employeeId, startYear, startWeek, endYear, endWeek);
CREATE INDEX IF NOT EXISTS idx_project_phases_project ON project_phases (projectId, sortOrder);
CREATE INDEX IF NOT EXISTS idx_vacations_employee ON vacations (employeeId, startYear, startWeek, endYear, endWeek);
CREATE INDEX IF NOT EXISTS idx_projects_projektart ON projects (projektart);
