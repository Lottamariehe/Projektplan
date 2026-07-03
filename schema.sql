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
  id          TEXT PRIMARY KEY,
  vorname     TEXT NOT NULL DEFAULT '',
  nachname    TEXT NOT NULL DEFAULT '',
  funktion    TEXT,
  aktiv       INTEGER NOT NULL DEFAULT 1,
  bemerkungen TEXT,
  createdAt   TEXT,
  updatedAt   TEXT
);

-- Zuordnung Projekt <-> Mitarbeiter (Mehrfachauswahl in beide Richtungen)
CREATE TABLE IF NOT EXISTS project_employees (
  projectId  TEXT NOT NULL,
  employeeId TEXT NOT NULL,
  PRIMARY KEY (projectId, employeeId)
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
CREATE INDEX IF NOT EXISTS idx_project_tags_tag ON project_tags (tag);
CREATE INDEX IF NOT EXISTS idx_tender_gewerke_gewerk ON tender_gewerke (gewerk);
CREATE INDEX IF NOT EXISTS idx_employees_aktiv ON employees (aktiv);
