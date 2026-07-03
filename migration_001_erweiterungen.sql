-- =========================================================
-- migration_001_erweiterungen.sql
-- Migration für BESTEHENDE Datenbanken (löscht/verändert keine
-- vorhandenen Zeilen in projects/tenders/settings).
-- Fügt hinzu: Mitarbeiterverwaltung, Projekt-Tags, Gewerke je
-- Ausschreibung, Vergabeportale, Admin-Konfiguration sowie die
-- neue Spalte tenders.portalId.
--
-- Anwenden über die Cloudflare-Dashboard-Konsole der D1-Datenbank
-- (Inhalt einfügen & ausführen) oder mit:
--   wrangler d1 execute <DB-NAME> --remote --file=./migration_001_erweiterungen.sql
--
-- Die Migration ist mehrfach ausführbar (IF NOT EXISTS), ein
-- versehentliches doppeltes Anwenden richtet keinen Schaden an.
-- =========================================================

-- Neue Spalte an bestehender Tabelle "tenders": Ausschreibungsportal
ALTER TABLE tenders ADD COLUMN portalId TEXT;

-- Baustellenmitarbeiter (Stammdaten)
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

-- Zuordnung Projekt <-> Mitarbeiter
CREATE TABLE IF NOT EXISTS project_employees (
  projectId  TEXT NOT NULL,
  employeeId TEXT NOT NULL,
  PRIMARY KEY (projectId, employeeId)
);

-- Projekt-Tags (zusätzlich zur Farbe)
CREATE TABLE IF NOT EXISTS project_tags (
  projectId TEXT NOT NULL,
  tag       TEXT NOT NULL,
  PRIMARY KEY (projectId, tag)
);

-- Gewerke je Ausschreibung
CREATE TABLE IF NOT EXISTS tender_gewerke (
  tenderId TEXT NOT NULL,
  gewerk   TEXT NOT NULL,
  PRIMARY KEY (tenderId, gewerk)
);

-- Vergabeportale (Stammdaten, ohne Zugangsdaten)
CREATE TABLE IF NOT EXISTS portals (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  url       TEXT,
  hinweis   TEXT,
  createdAt TEXT,
  updatedAt TEXT
);

-- Admin-Konfiguration (Admin-E-Mail-Adressen als JSON-Array)
CREATE TABLE IF NOT EXISTS admin_config (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  adminEmails TEXT NOT NULL
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_tenders_portal ON tenders (portalId);
CREATE INDEX IF NOT EXISTS idx_project_employees_employee ON project_employees (employeeId);
CREATE INDEX IF NOT EXISTS idx_project_tags_tag ON project_tags (tag);
CREATE INDEX IF NOT EXISTS idx_tender_gewerke_gewerk ON tender_gewerke (gewerk);
CREATE INDEX IF NOT EXISTS idx_employees_aktiv ON employees (aktiv);

-- Initiale Admin-E-Mail-Adressen eintragen (nur falls noch keine
-- Zeile existiert – bestehende Konfiguration bleibt unangetastet).
INSERT INTO admin_config (id, adminEmails)
SELECT 1, '["adm.heise@heise-haustechnik.de","lotta_heise@live.de","l.heise@heise-haustechnik.de"]'
WHERE NOT EXISTS (SELECT 1 FROM admin_config WHERE id = 1);
