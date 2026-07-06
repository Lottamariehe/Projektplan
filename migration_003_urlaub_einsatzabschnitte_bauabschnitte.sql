-- =========================================================
-- migration_003_urlaub_einsatzabschnitte_bauabschnitte.sql
-- Additive Migration für BESTEHENDE Datenbanken. Bestehende
-- Daten in projects/tenders/employees/project_employees/... bleiben
-- vollständig erhalten. Es werden ausschließlich NEUE Tabellen
-- ergänzt sowie (verlustfrei) bereits vorhandene individuelle
-- Mitarbeiter-Zeiträume aus project_employees in die neue Tabelle
-- assignment_periods übernommen.
--
-- Fügt hinzu:
--   - assignment_periods  (beliebig viele Einsatzzeiträume je
--                          Mitarbeiter UND Projekt)
--   - project_phases      (beliebig viele Bauabschnitte je Projekt)
--   - vacations            (Urlaubsverwaltung je Mitarbeiter)
--
-- Anwenden mit:
--   wrangler d1 execute <DB-NAME> --remote --file=./migration_003_urlaub_einsatzabschnitte_bauabschnitte.sql
-- oder über die Cloudflare-Dashboard-Konsole der D1-Datenbank.
--
-- Die Migration ist mehrfach ausführbar (IF NOT EXISTS bei den
-- Tabellen/Indizes). Der Übernahme-Schritt der Altzeiträume ist
-- durch eine WHERE-NOT-EXISTS-Bedingung ebenfalls doppelt-sicher:
-- ein erneuter Lauf legt keine doppelten assignment_periods an.
-- =========================================================

-- ---------------------------------------------------------
-- 1) Neue Tabellen
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
-- 2) Bestehende individuelle Mitarbeiter-Zeiträume aus
--    project_employees (Spalten startYear/startWeek/endYear/
--    endWeek) verlustfrei nach assignment_periods übernehmen.
--    Ab jetzt ist assignment_periods die alleinige Datenquelle
--    für individuelle Einsatzzeiträume - die Altspalten in
--    project_employees werden von der neuen App-Version nicht
--    mehr gelesen, aber zur Sicherheit nicht gelöscht.
-- ---------------------------------------------------------
INSERT INTO assignment_periods (id, projectId, employeeId, startYear, startWeek, endYear, endWeek, createdAt, updatedAt)
SELECT
  'asg_' || lower(hex(randomblob(8))),
  pe.projectId,
  pe.employeeId,
  pe.startYear,
  pe.startWeek,
  pe.endYear,
  pe.endWeek,
  datetime('now'),
  datetime('now')
FROM project_employees pe
WHERE pe.startYear IS NOT NULL AND pe.startWeek IS NOT NULL
  AND pe.endYear IS NOT NULL AND pe.endWeek IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM assignment_periods ap
    WHERE ap.projectId = pe.projectId AND ap.employeeId = pe.employeeId
  );

-- ---------------------------------------------------------
-- 3) Indizes
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_assignment_periods_project ON assignment_periods (projectId);
CREATE INDEX IF NOT EXISTS idx_assignment_periods_employee ON assignment_periods (employeeId, startYear, startWeek, endYear, endWeek);
CREATE INDEX IF NOT EXISTS idx_project_phases_project ON project_phases (projectId, sortOrder);
CREATE INDEX IF NOT EXISTS idx_vacations_employee ON vacations (employeeId, startYear, startWeek, endYear, endWeek);
