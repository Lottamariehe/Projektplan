-- =========================================================
-- migration_002_personaleinsatzplanung.sql
-- Additive Migration für die neue Ansicht "Personaleinsatzplanung".
-- Bestehende Daten bleiben vollständig erhalten – es werden nur
-- neue, NULLABLE Spalten und Indizes ergänzt. Keine Tabelle wird
-- gelöscht oder umbenannt.
--
-- Anwenden mit:
--   wrangler d1 execute <DB-NAME> --remote --file=./migration_002_personaleinsatzplanung.sql
-- =========================================================

-- ---------------------------------------------------------
-- Mitarbeiter: zusätzliche, optionale Stammdatenfelder
-- (werden in der Mitarbeiterverwaltung und in der
-- Personaleinsatzplanung angezeigt, sind aber nicht
-- verpflichtend auszufüllen).
-- ---------------------------------------------------------
ALTER TABLE employees ADD COLUMN team TEXT;
ALTER TABLE employees ADD COLUMN qualifikation TEXT;
ALTER TABLE employees ADD COLUMN wochenarbeitszeit REAL;
ALTER TABLE employees ADD COLUMN beschaeftigungsstatus TEXT;
ALTER TABLE employees ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0;

-- ---------------------------------------------------------
-- Zuordnung Projekt <-> Mitarbeiter: optionaler individueller
-- Zeitraum je Mitarbeiter INNERHALB des Projektzeitraums.
-- NULL bedeutet: der Mitarbeiter ist während der gesamten
-- Projektlaufzeit eingeplant (Standardfall, keine Änderung
-- am bisherigen Verhalten).
-- ---------------------------------------------------------
ALTER TABLE project_employees ADD COLUMN startYear INTEGER;
ALTER TABLE project_employees ADD COLUMN startWeek INTEGER;
ALTER TABLE project_employees ADD COLUMN endYear INTEGER;
ALTER TABLE project_employees ADD COLUMN endWeek INTEGER;

-- ---------------------------------------------------------
-- Bestehende Mitarbeiter erhalten eine stabile, aufsteigende
-- Sortierreihenfolge (Ausgangspunkt für die manuelle
-- Drag-and-drop-Sortierung in der Personaleinsatzplanung).
-- ---------------------------------------------------------
UPDATE employees SET sortOrder = (
  SELECT COUNT(*) FROM employees e2
  WHERE e2.nachname || '|' || e2.vorname || '|' || e2.id < employees.nachname || '|' || employees.vorname || '|' || employees.id
);

-- ---------------------------------------------------------
-- Index für die Zeitraumfilterung/Konflikterkennung je Mitarbeiter
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_project_employees_zeitraum ON project_employees (employeeId, startYear, startWeek, endYear, endWeek);
CREATE INDEX IF NOT EXISTS idx_employees_sortorder ON employees (sortOrder);
CREATE INDEX IF NOT EXISTS idx_employees_team ON employees (team);
