-- =========================================================
-- schema.sql – D1-Datenbankschema für den Baustellenplaner
-- Anwenden mit:
--   wrangler d1 execute shk_baustellenplaner_db --remote --file=./schema.sql
-- (siehe SETUP-ANLEITUNG.md, Schritt "Datenbank anlegen")
-- =========================================================

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
  createdAt          TEXT,
  updatedAt          TEXT
);

-- Einstellungen (Projektleiter-/Obermonteur-Liste, Kapazitätsgrenzen,
-- Farbpalette) als ein JSON-Blob in genau einer Zeile (id = 1).
CREATE TABLE IF NOT EXISTS settings (
  id   INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_zeitraum ON projects (startYear, startWeek, endYear, endWeek);
CREATE INDEX IF NOT EXISTS idx_tenders_zeitraum ON tenders (startYear, startWeek, endYear, endWeek);
CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders (angebotsstatus);
